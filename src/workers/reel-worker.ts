import { Worker, Job } from 'bullmq';
import { redis } from '../db/redis.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { VideoComposerService } from '../services/video-composer.service.js';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import stream from 'stream';
import { promisify } from 'util';
import { scheduleNextReel } from '../services/reel-scheduler.service.js';

const pipeline = promisify(stream.pipeline);

async function downloadToTemp(url: string, fileName: string, strict: boolean = false): Promise<string> {
  const tempPath = path.join(os.tmpdir(), fileName);
  try {
    // Robust local resolution for localhost URLs and relative paths
    let cleanUrl = url;
    if (url.startsWith('http://localhost:3000') || url.startsWith('http://localhost:3001') || url.startsWith('http://127.0.0.1')) {
      cleanUrl = url.replace(/^https?:\/\/[^\/]+/, '');
    }

    if (cleanUrl.startsWith('/')) {
      // Resolve path in the frontend public directory
      const localFilePath = path.join(process.cwd(), 'frontend', 'public', cleanUrl);
      if (fs.existsSync(localFilePath)) {
        console.log(`[Worker Local Copy] Copying local asset directly from ${localFilePath}`);
        fs.copyFileSync(localFilePath, tempPath);
        return tempPath;
      }
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000) // 15s timeout
    });
    
    if (!response.ok) {
      throw new Error(`HTTP Status ${response.status}`);
    }
    
    const fileStream = fs.createWriteStream(tempPath);
    // @ts-ignore
    await pipeline(response.body, fileStream);
    return tempPath;
  } catch (err: any) {
    if (strict) {
      console.error(`[Worker Download Strict Error] Failed to download exact user asset: ${url}. Error: ${err.message}`);
      throw new Error(`Failed to download user-provided asset: ${err.message}`);
    }
    console.error(`[Worker Download Fallback] Failed to download ${url}: ${err.message}. Using backup asset.`);
    
    const isAudio = url.includes('.mp3') || url.includes('.wav') || url.includes('.ogg') || fileName.includes('audio') || fileName.includes('bgm');
    
    if (!isAudio) {
      try {
        console.log(`[Worker Download Resiliency Fallback] Dynamically generating backdrop for ${fileName} via Google -> NVIDIA -> Pixabay...`);
        const { aiOrchestrator } = await import('../services/ai-orchestrator.service.js');
        const generatedPath = await aiOrchestrator.fetchStockImage("beautiful cinematic vertical background wallpaper");
        if (fs.existsSync(generatedPath)) {
          fs.copyFileSync(generatedPath, tempPath);
          return tempPath;
        }
      } catch (genErr: any) {
        console.error(`[Worker Download Resiliency Fallback] Dynamic image generation chain failed: ${genErr.message}`);
      }
    }

    const fallbackUrl = isAudio
      ? 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3'
      : 'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=400&h=720&fit=crop'; // fallback URL as safety check only

    try {
      const response = await fetch(fallbackUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error(`Backup server returned ${response.status}`);
      const fileStream = fs.createWriteStream(tempPath);
      // @ts-ignore
      await pipeline(response.body, fileStream);
      return tempPath;
    } catch (fallbackErr: any) {
      console.error(`[Worker Download Resiliency Critical] Backup also failed: ${fallbackErr.message}. Creating empty placeholder.`);
      fs.writeFileSync(tempPath, Buffer.alloc(0));
      return tempPath;
    }
  }
}

export class ReelWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'reel-generation',
      this.processJob.bind(this),
      {
        connection: redis,
        concurrency: 2,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info({ event: 'reel_generation_completed', jobId: job.id, reelId: job.data.reelId });
    });

    this.worker.on('failed', (job, err) => {
      logger.error({ event: 'reel_generation_failed', jobId: job?.id, reelId: job?.data.reelId, error: err.message });
    });
  }

  private async processJob(job: Job<{ 
    reelId: string; 
    seriesId?: string;
    enableMusic?: boolean;
    enableVoice?: boolean;
    scriptText?: string | null;
    hookText?: string | null;
    language?: string;
    voiceId?: string;
  }>) {
    const { reelId, seriesId, enableMusic = true, enableVoice = true, scriptText: customScriptText, hookText: customHookText, language = 'English', voiceId = 'en-US-Journey-F' } = job.data;
    logger.info({ event: 'reel_generation_started', reelId, seriesId });
    const tempFilesToCleanup: string[] = [];
    
    const generationMetadata: any = {
      llmDetails: "Script: Gemini 2.5 | Audio: Google TTS | Visuals: Gemini Flash Image & Pexels",
      startedAt: Date.now(),
      model_llm: 'gemini-2.5-flash',
      model_image: 'gemini-3.1-flash-image',
      model_voice: voiceId || 'en-US-Journey-F',
      shots: []
    };

    try {
      // 1. Update status to GENERATING
      const updateProgress = async (msg: string) => {
        logger.info({ event: 'reel_progress', reelId, message: msg });
        await prisma.reel.update({
          where: { id: reelId },
          data: { status: 'GENERATING', statusMessage: msg },
        });
      };
      
      await updateProgress('🚀 Initializing AI Engine...');

      const reelWithDetails = await prisma.reel.findUniqueOrThrow({
        where: { id: reelId },
        include: {
          user: true,
          assets: true,
          series: {
            include: {
              user: true,
            },
          },
        },
      });
      
      if (reelWithDetails.type === 'PRODUCT') {
        await updateProgress('🚀 Initializing AI Product Reel Engine...');
  
        const assets = reelWithDetails.assets;
        if (!assets || assets.length === 0) {
          throw new Error('No assets found for this product reel.');
        }

        await updateProgress(`Downloading ${assets.length} product assets...`);
        const downloadedAssetPaths: string[] = [];
        for (const asset of assets) {
          const fileName = `${reelId}_${path.basename(asset.url)}`;
          // Use strict = true to ensure only original provided images are kept and no random fallbacks are generated
          const downloadedPath = await downloadToTemp(asset.url, fileName, true);
          downloadedAssetPaths.push(downloadedPath);
          tempFilesToCleanup.push(downloadedPath);
        }

        const secondsPerAsset = 4.0;
        const clipDurations: number[] = [];
        let computedTotalDuration = 0;
        
        for (const assetPath of downloadedAssetPaths) {
          const isVideo = assetPath.toLowerCase().endsWith('.mp4') || assetPath.toLowerCase().endsWith('.webm') || assetPath.toLowerCase().endsWith('.mov');
          if (isVideo) {
            try {
              const videoDur = await VideoComposerService.getMediaDuration(assetPath);
              clipDurations.push(videoDur);
              computedTotalDuration += videoDur;
            } catch (err) {
              clipDurations.push(secondsPerAsset);
              computedTotalDuration += secondsPerAsset;
            }
          } else {
            clipDurations.push(secondsPerAsset);
            computedTotalDuration += secondsPerAsset;
          }
        }

        // Account for xfade transition overlaps shrinking the final video
        const totalOverlap = Math.max(0, (downloadedAssetPaths.length - 1) * 0.5);
        const targetDuration = Math.max(8, computedTotalDuration - totalOverlap);
        // Average speech rate is 2.3 words/sec. Instruct LLM to fit this exactly.
        const targetWordCount = Math.round(targetDuration * 2.3);

        await updateProgress(`🤖 Preparing AI Product Reel copy...`);
        let scriptText = customScriptText !== undefined && customScriptText !== null ? customScriptText.trim() : '';
        let hookText = customHookText !== undefined && customHookText !== null ? customHookText.trim() : '';

        // If script is not provided, disable voice narration functionality
        let activeEnableVoice = enableVoice;
        if (!scriptText || scriptText.length === 0) {
          activeEnableVoice = false;
        }

        let ttsPath: string | null = null;
        if (activeEnableVoice && scriptText && scriptText.length > 0) {
          await updateProgress('🗣️ Synthesizing premium brand voiceover...');
          ttsPath = await aiOrchestrator.generateVoiceover(scriptText, voiceId, language);
          tempFilesToCleanup.push(ttsPath);
        }

        await updateProgress('🎬 Assembling your cinematic masterpiece...');
        // Clip duration is dynamically based on asset type
        const { clipPaths, tempFiles: composerTempFiles } = await VideoComposerService.createVideoClips(
          downloadedAssetPaths, 
          clipDurations, 
          'vertical', 
          new AbortController().signal
        );
        if (clipPaths) tempFilesToCleanup.push(...clipPaths);
        if (composerTempFiles) tempFilesToCleanup.push(...composerTempFiles);

        const { outputPath: concatVideoPath, tempFiles: concatTempFiles } = await VideoComposerService.concatVideos(clipPaths, new AbortController().signal, clipDurations);
        if (concatVideoPath) tempFilesToCleanup.push(concatVideoPath);
        if (concatTempFiles) tempFilesToCleanup.push(...concatTempFiles);

        let finalVideoPath = concatVideoPath;

        try {
          let bgmPath: string | null = null;
          if (enableMusic) {
            await updateProgress("🎵 Composing background music and assembling video...");
            
            // Dynamic BGM vibe selection to prevent same BGM in every product reel
            let musicVibePrompt = "cinematic ambient background music";
            if (scriptText) {
              try {
                const promptForMusicVibe = `Based on this product ad script, describe the perfect instrumental background music genre, tempo, and emotion in a 10-word description (e.g. "Upbeat, energetic electronic synth-pop beat with an advertising feel"). Do not write any other text. Script: "${scriptText.substring(0, 300)}"`;
                const vibeResult = await aiOrchestrator.generateContent(promptForMusicVibe);
                const cleanedVibe = vibeResult.trim().replace(/['"“”\.]/g, '');
                if (cleanedVibe.length > 5) {
                  musicVibePrompt = `${cleanedVibe} background music`;
                }
                console.log(`[Music AI] Dynamically determined BGM vibe: "${musicVibePrompt}"`);
              } catch (musicVibeErr) {
                console.error('[Music AI] Error determining music vibe:', musicVibeErr);
              }
            } else if (reelWithDetails.script) {
              // Fallback to initial prompt context if script is blank
              try {
                const promptForMusicVibe = `Based on this product context, describe the perfect instrumental background music genre in 10 words. Context: "${reelWithDetails.script.substring(0, 200)}"`;
                const vibeResult = await aiOrchestrator.generateContent(promptForMusicVibe);
                const cleanedVibe = vibeResult.trim().replace(/['"“”\.]/g, '');
                if (cleanedVibe.length > 5) {
                  musicVibePrompt = `${cleanedVibe} background music`;
                }
              } catch {}
            }
            bgmPath = await aiOrchestrator.generateMusic(musicVibePrompt);
            if (bgmPath) tempFilesToCleanup.push(bgmPath);
          }

          let mixedAudioPath: string | null = null;
          if (ttsPath && bgmPath) {
            const { outputPath: mixed, tempFiles: bgmTempFiles } = await VideoComposerService.addBackgroundMusic(ttsPath, bgmPath, targetDuration, new AbortController().signal);
            mixedAudioPath = mixed;
            if (mixedAudioPath) tempFilesToCleanup.push(mixedAudioPath);
            if (bgmTempFiles) tempFilesToCleanup.push(...bgmTempFiles);
          } else if (ttsPath) {
            mixedAudioPath = ttsPath;
          } else if (bgmPath) {
            mixedAudioPath = await VideoComposerService.extendAudio(bgmPath, targetDuration, new AbortController().signal);
            tempFilesToCleanup.push(mixedAudioPath);
          }
          
          let subtitlePath: string | undefined = undefined;
          if (activeEnableVoice && scriptText && scriptText.length > 0 && ttsPath) {
            await updateProgress("💬 Transcribing audio for perfect subtitle timing...");
            let actualAudioDuration = targetDuration;
            let wordTimings: Array<{word: string, startTime: number, endTime: number}> = [];
            try {
              actualAudioDuration = await VideoComposerService.getMediaDuration(ttsPath);
              if (language && language.includes('Hindi')) {
                  wordTimings = [];
              } else {
                  wordTimings = await aiOrchestrator.transcribeAudio(ttsPath, 'en-US');
              }
            } catch(e) {}
            
            await updateProgress("💬 Burning animated subtitles into final video...");
            subtitlePath = await VideoComposerService.generateSubtitlesFile(scriptText, actualAudioDuration, wordTimings);
            if (subtitlePath) tempFilesToCleanup.push(subtitlePath);
          } else if (activeEnableVoice && scriptText && scriptText.length > 0) {
            // Fallback if voiceover wasn't generated but text exists
            await updateProgress("💬 Burning animated subtitles into final video...");
            subtitlePath = await VideoComposerService.generateSubtitlesFile(scriptText, targetDuration);
            if (subtitlePath) tempFilesToCleanup.push(subtitlePath);
          }

          // Render both subtitlePath and our new viral hookText with exact targetDuration!
          const { outputPath: videoWithAudio, tempFiles: mergeTempFiles } = await VideoComposerService.mergeAudioVideo(
            concatVideoPath, 
            mixedAudioPath, 
            subtitlePath, 
            new AbortController().signal, 
            hookText || undefined, 
            targetDuration
          );
          if (videoWithAudio) tempFilesToCleanup.push(videoWithAudio);
          if (mergeTempFiles) tempFilesToCleanup.push(...mergeTempFiles);
          
          finalVideoPath = videoWithAudio;
        } catch (audioError: any) {
          logger.error({ event: "reel_bgm_failed", reelId, error: audioError.message });
        }


        const publicFilename = `reel_${reelId}_${Date.now()}.mp4`;
        const publicDir = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'reels');
        if (!fs.existsSync(publicDir)) {
          fs.mkdirSync(publicDir, { recursive: true });
        }
        const publicFilePath = path.join(publicDir, publicFilename);
        fs.copyFileSync(finalVideoPath, publicFilePath);
        
        const videoUrl = `/uploads/reels/${publicFilename}`;
        
        // Generate thumbnail for the video and save both
        const thumbnailPath = await VideoComposerService.generateThumbnail(publicFilePath);
        const thumbnailFilename = `thumb_${publicFilename}`;
        const thumbnailDestPath = path.join(publicDir, thumbnailFilename);
        fs.copyFileSync(thumbnailPath, thumbnailDestPath);
        const thumbnailDestUrl = `/uploads/reels/${thumbnailFilename}`;

        await prisma.reel.update({
          where: { id: reelId },
          data: { 
            status: 'READY', 
            videoUrl, 
            metadata: generationMetadata,
            script: scriptText,
            thumbnail: thumbnailDestUrl 
          },
        });

        return { success: true, videoUrl };
      } 

      // Existing logic for series reels
      if (!seriesId) {
        throw new Error('seriesId is required for SERIES type reels');
      }

      const series = await prisma.reelSeries.findUniqueOrThrow({
        where: { id: seriesId },
        include: { user: true }
      });

      // Fetch up to 15 past scripts in this series to avoid repeating topics/stories
      const pastReels = await prisma.reel.findMany({
        where: {
          seriesId,
          script: { not: null },
        },
        select: {
          script: true
        },
        take: 15,
        orderBy: { createdAt: 'desc' }
      });

      const pastScriptsList = pastReels
        .map(r => r.script)
        .filter(Boolean)
        .map((s, idx) => `Reel ${idx + 1}: "${s!.substring(0, 200)}..."`)
        .join('\n');

      let pastReelsPrompt = '';
      if (pastReels.length > 0) {
        pastReelsPrompt = `\n\nCRITICAL: UNIQUE CONTENT REQUIREMENT (DO NOT REPEAT PREVIOUS STORIES)
We have already created the following reels for this series:
${pastScriptsList}

You MUST choose a COMPLETELY DIFFERENT, new topic, story, fact, or mystery for this next reel. Do not repeat any of the main concepts, historical events, locations, figure names, or hooks from the list above. Choose something fresh and completely unrelated so that viewers get a new experience in every single video in the series. For example, if you wrote about 'Cicada 3301', write about a completely different mystery (e.g., Lake Karachay, the Max Headroom intrusion, Sad Satan game, mysterious radio signals, dark web mysteries, deep ocean sounds, etc.).`;
      }

      // 2. Phase 1: Generate Story Script (The Director)
      await updateProgress('✍️ Phase 1: Director is writing the cinematic script...');
      const durationStr = 'organic';
      const wordCountGoal = 'as many words as naturally needed to tell a great story (roughly 30 to 90 seconds of spoken audio)';
      
      let languagePrompt = `Language: ${series.language || 'English'}. Write the script ONLY in ${series.language || 'English'}.`;
      if (series.language === 'Hindi') {
        languagePrompt = `Language: Hindi. CRITICAL: You MUST write the script twice. First, "script_tts" MUST be written exclusively in the Devanagari script (हिंदी लिपि) so the TTS engine pronounces it perfectly. Second, "script" MUST be written in Roman (Hinglish/English characters), which will be used for on-screen subtitles. The TONE and VOCABULARY should NOT be formal or pure bookish Hindi. Use a natural, everyday mix of Desi Hindi, Urdu words, and common English words, exactly like a modern Indian TikToker or YouTuber speaks. Make it sound highly conversational, natural, and relatable. Both scripts must say exactly the same thing.`;
      }
      const regionStoryRule = series.targetRegion && series.targetRegion !== 'Global' 
        ? `\nCRITICAL REGIONAL CONTEXT: Set the cultural context, character names, foods, locations, and references strictly to ${series.targetRegion} origin.` 
        : '';
        
      const storyPrompt = `You are a TikTok/Reels storyteller. Your task is to write a highly engaging ${durationStr} script about: "${series.niche || series.customPrompt}".${pastReelsPrompt}${regionStoryRule}
 
CRITICAL AUDIENCE & VOCABULARY RULE: 
The script and tone MUST be engaging, edgy, and highly relatable for teenagers (Gen Z audience). Do not talk to them like a child. Use punchy, dynamic, modern vocabulary that holds a teen's attention. Keep it fast-paced, suspenseful, and captivating.
 
KOKORO TTS OPTIMIZATION RULES (CRITICAL):
1. NO HASHTAGS OR EMOJIS: Do not use any emojis, hashtags, or special characters like @, $, %.
2. SPELL OUT NUMBERS: Always write numbers as words (e.g., write "one hundred" instead of "100").
3. ADVANCED INTONATION & STRESS: To make the storytelling incredibly dynamic, you must rely exclusively on PUNCTUATION.
   - To adjust intonation, actively use punctuation: ;:,.!?—…"()“”
   - Use ellipses (...) when you want a dramatic, suspenseful pause.
   - DO NOT use markdown brackets or parentheses like [word](+1). The TTS engine will read them out loud by mistake.
   - Example: "He opened the door, and suddenly... there was nothing inside."
4. SHORT SENTENCES: Break long ideas into very short sentences. Kokoro sounds most natural and emotional when reading short, punchy statements.
 
STORYTELLING STRUCTURE:
1. HOOK (0-3s): Start with a very simple, surprising question or statement.
2. STORY/FACTS: Explain the core topic using the simplest words possible. Make it sound like you are telling a campfire story to a friend.
3. THE TWIST/PEAK: The most mind-blowing or interesting part of the story.
4. ENDING: End with a lingering thought or simple call to action.
 
PACING & RULES:
- The script should be organically paced. Use ${wordCountGoal}. Do not artificially pad or trim the story.
- ${languagePrompt}
- The narration must feel intense, highly visual, rhythmic, and perfectly matched to the topic of "${series.niche || series.customPrompt}".
 
Output ONLY valid JSON: 
{
  "script": "...", 
  "script_tts": "...", 
  "audio_prompt": "Describe the perfect cinematic background music to match the emotional tone and pacing of this story in detail. Example: 'Deep, atmospheric cinematic ambient synth pads with a slow, emotional buildup.'"
}`;

      let script = '';
      let scriptTts = '';
      let characterContext = '';
      let locationContext = '';
      let visuals: any[] = [];
      let numKeywords = 12;

      try {
        const aiResultText = await aiOrchestrator.generateContent(storyPrompt);
        const rawContent = aiResultText.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(rawContent);
        if (!parsed.script) throw new Error('AI output did not contain a "script" field.');
        script = parsed.script;
        scriptTts = parsed.script_tts || parsed.script;
        (series as any).aiMusicPrompt = parsed.audio_prompt;
      } catch (e: any) {
        logger.error({ event: 'reel_ai_script_failed', reelId, error: e.message });
        throw new Error(`AI Script Failed: ${e.message}`);
      }

      await prisma.reel.update({
        where: { id: reelId },
        data: { script },
      });

      // Phase 2: Memory Extraction (Art Director)
      await updateProgress('🧠 Phase 2: Art Director is parsing Memory Core...');
      try {
        const regionMemoryRule = series.targetRegion && series.targetRegion !== 'Global'
          ? `\nCRITICAL: Ensure all extracted/generated characters explicitly have physical traits and demographics matching ${series.targetRegion} origin in their descriptions.`
          : '';
          
        const memoryPrompt = `Analyze the following script and extract the main characters and locations.${regionMemoryRule}
Script: "${script}"
Output ONLY valid JSON:
{
  "characters": [{ "name": "...", "physical": "...", "wardrobe": "..." }],
  "locations": [{ "name": "...", "architecture": "...", "lighting": "..." }]
}`;
        const memoryResText = await aiOrchestrator.generateContent(memoryPrompt);
        const memParsed = JSON.parse(memoryResText.replace(/```json\n?|```/g, '').trim());
        characterContext = JSON.stringify(memParsed.characters || []);
        locationContext = JSON.stringify(memParsed.locations || []);
        
        for (const char of memParsed.characters || []) {
            await prisma.seriesCharacter.create({ data: { seriesId: series.id, name: char.name, physical: char.physical, wardrobe: char.wardrobe } });
        }
      } catch (e) {
        console.warn("[Art Director] Failed to parse memory core, proceeding with empty context.");
      }

      // Dynamically calculate the number of shots required for organic pacing (1 shot ~every 15 words)
      const scriptWordCount = script.split(/\s+/).length;
      numKeywords = Math.max(4, Math.ceil(scriptWordCount / 15));

      // Phase 3: Shot Planning (Cinematographer)
      await updateProgress(`🎥 Phase 3: Cinematographer is planning the Shot List (${numKeywords} shots)...`);
      try {
         const cinePrompt = `You are an elite Cinematographer. Break down this organic script into an appropriately paced sequence of exactly ${numKeywords} cinematic shots.
Script: "${script}"
Characters: ${characterContext}
Locations: ${locationContext}

CRITICAL MEDIA RULE: 
- You MUST think smartly and dynamically decide the best "media_type" for each shot based purely on the story and scene context.
- Use "ai_image" when the scene requires specific characters, expressive faces, highly stylized aesthetics, or unique actions that are hard to find in generic stock footage.
- Use "stock_video" or "stock_photo" ONLY for generic establishing shots, nature, standard cityscapes, or simple B-roll where realistic footage is best.${series.targetRegion && series.targetRegion !== 'Global' ? `\n- CRITICAL REGION RULE: You MUST explicitly append "in ${series.targetRegion}" and mention ${series.targetRegion} demographics to EVERY SINGLE keyword description so the visual generator outputs ${series.targetRegion} specific content.` : ''}

CAMERA MOVEMENTS: Choose exactly one per shot: 'zoom_in', 'zoom_out', 'pan_right', 'pan_left', 'pan_up', 'pan_down', 'static'. Use varied movements.

Output ONLY valid JSON:
{
  "visuals": [
    { 
      "keyword": "detailed description of the exact visual frame, explicitly naming characters and environment.", 
      "search_query": "simple 2-3 word search query if using stock_video or stock_photo (e.g. 'mumbai traffic')",
      "media_type": "MUST BE EITHER 'ai_image', 'stock_video', OR 'stock_photo'", 
      "camera_movement": "zoom_in",
      "lighting": "High contrast rim lighting"
    }
  ]
}`;
         const cineResText = await aiOrchestrator.generateContent(cinePrompt);
         const cineParsed = JSON.parse(cineResText.replace(/```json\n?|```/g, '').trim());
         visuals = cineParsed.visuals || [];
      } catch (e) {
         console.error("[Cinematographer] Failed, falling back to basic shots.");
         throw new Error("Cinematographer planning failed.");
      }

      await prisma.reel.update({
        where: { id: reelId },
        data: { script },
      });

      // 3. Generate Voiceover First (to determine exact video length)
      await updateProgress('🗣️ Synthesizing voice with Gemini 3.1 Flash TTS...');
      logger.info({ event: 'reel_adding_audio', reelId });
      
      let ttsPath: string;
      let actualDuration = 60;
      let wordTimings: Array<{word: string, startTime: number, endTime: number}> = [];
      
      try {
        ttsPath = await aiOrchestrator.generateVoiceover(scriptTts, series.voiceId || 'en-US-Journey-F', series.language || 'English');
        if (ttsPath) {
          tempFilesToCleanup.push(ttsPath);
        }
        
        try {
          actualDuration = await VideoComposerService.getMediaDuration(ttsPath);
          // Do not pad actualDuration here; exact timing is required for accurate subtitle sync
          logger.info({ event: 'reel_audio_duration', reelId, actualDuration });
          
          if (series.language && series.language.includes('Hindi')) {
              console.log("[Subtitle Engine] Hindi detected. Skipping AI transcription to allow English translation fallback.");
              wordTimings = []; // Forces fallback to math heuristics using the English script
          } else {
              await updateProgress('💬 Transcribing audio for perfect subtitle timing...');
              wordTimings = await aiOrchestrator.transcribeAudio(ttsPath, 'en-US');
          }
        } catch (durationErr: any) {
          // ffprobe can't read the file — estimate from word count (avg 2.5 words/sec)
          logger.warn({ event: 'reel_ffprobe_fallback', reelId, error: durationErr.message });
          const wordCount = script.split(/\s+/).length;
          actualDuration = Math.ceil(wordCount / 2.5) + 2;
          console.warn(`[Worker] ffprobe failed, estimated duration from word count: ${actualDuration}s`);
        }
      } catch (audioError: any) {
        logger.error({ event: 'reel_audio_failed', reelId, error: audioError.message });
        throw new Error(`Voice Generation Failed: ${audioError.message}`);
      }

      // 4. Generate Images & QA Loop
      await updateProgress(`🎨 Phase 4: Production & QA Loop (${actualDuration}s video)...`);
      logger.info({ event: 'reel_generating_images', reelId });
      
      // Use a consistent seed for all images in this reel to enforce visual consistency
      const reelSeed = Math.floor(Math.random() * 1000000);
      
      const imageUrls: string[] = [];
      const cameraMovements: string[] = [];
      let currentShotIndex = 1;
      const totalShots = visuals.slice(0, numKeywords).length;

      for (const visual of visuals.slice(0, numKeywords)) {
        await updateProgress(`🎨 Phase 4: Production & QA (Shot ${currentShotIndex}/${totalShots})...`);
        const keyword = visual.keyword;
        const mediaType = visual.media_type || 'ai_image';
        const intendedMovement = visual.camera_movement || 'zoom_in';
        const lighting = visual.lighting || 'cinematic';
        
        let attempts = 0;
        const maxAttempts = 3;
        let finalUrl = '';
        const searchQuery = visual.search_query || keyword;
        
        while (attempts < maxAttempts) {
            attempts++;
            try {
              if (mediaType === 'stock_video') {
                finalUrl = await aiOrchestrator.getBestStockVideo(searchQuery);
                break; // Skip QA for stock
              } else if (mediaType === 'stock_photo') {
                finalUrl = await aiOrchestrator.getBestStockImage(searchQuery);
                break; // Skip QA for stock
              } else {
                // Phase 4: Prompt Engineering
                const engineeredPrompt = `A high-quality, vertical 9:16 portrait orientation image of: ${keyword}. Lighting: ${lighting}. Shot on 50mm lens, highly detailed, photorealistic, 8k resolution, cinematic lighting, ${series.artStyle} style. CRITICAL: The image MUST have perfect human anatomy, beautiful symmetrical faces, no distortion, no extra limbs, no weird hands, and absolutely NO text or watermarks.`;
                
                finalUrl = await aiOrchestrator.generateImage(engineeredPrompt, reelSeed + attempts, false);
                await new Promise(r => setTimeout(r, 1000));
                
                // Phase 5: Vision QA Inspector
                const qaResult = await aiOrchestrator.evaluateImage(finalUrl, keyword, characterContext);
                if (qaResult.passed) {
                    break; // Image is good!
                } else {
                    console.log(`[QA Failed] Attempt ${attempts}: ${qaResult.reason}. Regenerating...`);
                }
              }
            } catch (e: any) {
              logger.warn({ event: 'reel_media_gen_failed', keyword, attempt: attempts, error: e.message });
              if (attempts === maxAttempts) {
                  try {
                    finalUrl = await aiOrchestrator.fetchStockImage(keyword);
                  } catch (e) {
                    finalUrl = await aiOrchestrator.generateImage("beautiful vertical scene", reelSeed, true);
                  }
              }
            }
        }
        
        generationMetadata.shots.push({
          shotIndex: currentShotIndex,
          keyword,
          mediaType,
          attempts,
          source: (mediaType === 'stock_video' || mediaType === 'stock_photo' || attempts === maxAttempts) ? 'stock' : 'ai_image',
          model: (mediaType === 'stock_video' || mediaType === 'stock_photo' || attempts === maxAttempts) ? 'stock-api' : 'gemini-2.5-flash-image'
        });
        
        imageUrls.push(finalUrl);
        cameraMovements.push(intendedMovement);
        currentShotIndex++;
      }

      // 5. Compose Video using VideoComposerService (FFmpeg)
      logger.info({ event: 'reel_composing_video', reelId });
      const abortController = new AbortController();

      const actualShotsCount = imageUrls.length || 1;
      // Compensate for the 0.5s xfade overlap between clips so the final video doesn't get shrunk below the audio duration
      const transitionOverlap = 0.5;
      const totalOverlap = Math.max(0, (actualShotsCount - 1) * transitionOverlap);
      const imageDuration = Math.ceil((actualDuration + totalOverlap) / actualShotsCount);
      const { clipPaths, tempFiles: composerTempFiles } = await VideoComposerService.createVideoClips(imageUrls, imageDuration, 'vertical', abortController.signal, cameraMovements);
      if (clipPaths) tempFilesToCleanup.push(...clipPaths);
      if (composerTempFiles) tempFilesToCleanup.push(...composerTempFiles);

      const { outputPath: concatVideoPath, tempFiles: concatTempFiles } = await VideoComposerService.concatVideos(clipPaths, abortController.signal, imageDuration);
      if (concatVideoPath) tempFilesToCleanup.push(concatVideoPath);
      if (concatTempFiles) tempFilesToCleanup.push(...concatTempFiles);

      // 6. Generate BGM & Mix Final Audio
      let finalVideoPath = concatVideoPath;
      try {
        await updateProgress('🎵 Composing background music and assembling video...');
        
        const musicPromptMap: Record<string, string> = {
          'cinematic-ambient': 'Deep, atmospheric cinematic ambient synth pads with a slow, emotional buildup.',
          'dark-suspense': 'Tense, pulsing electronic dark suspense beats suitable for a horror or mystery story.',
          'uplifting-acoustic': 'Light, hopeful acoustic guitar and piano playing a gentle uplifting melody.',
          'lofi-beats': 'Relaxed, warm vintage vinyl lofi hip-hop chill beats with a steady groove.'
        };
        
        const aiMusicPrompt = (series as any).aiMusicPrompt;
        const fallbackPrompt = (series.musicId && musicPromptMap[series.musicId]) || musicPromptMap['cinematic-ambient'];
        const finalMusicPrompt = aiMusicPrompt || fallbackPrompt;
        
        const bgmPath = await aiOrchestrator.generateMusic(finalMusicPrompt);
        if (bgmPath) tempFilesToCleanup.push(bgmPath);

        const { outputPath: mixedAudioPath, tempFiles: bgmTempFiles } = await VideoComposerService.addBackgroundMusic(ttsPath, bgmPath, actualDuration, abortController.signal);
        if (mixedAudioPath) tempFilesToCleanup.push(mixedAudioPath);
        if (bgmTempFiles) tempFilesToCleanup.push(...bgmTempFiles);
        
        await updateProgress('💬 Burning animated subtitles into final video...');
        const subtitlePath = await VideoComposerService.generateSubtitlesFile(script, actualDuration, wordTimings);
        if (subtitlePath) tempFilesToCleanup.push(subtitlePath);

        const { outputPath: videoWithAudio, tempFiles: mergeTempFiles } = await VideoComposerService.mergeAudioVideo(concatVideoPath, mixedAudioPath, subtitlePath, abortController.signal);
        if (videoWithAudio) tempFilesToCleanup.push(videoWithAudio);
        if (mergeTempFiles) tempFilesToCleanup.push(...mergeTempFiles);
        
        finalVideoPath = videoWithAudio;
      } catch (audioError: any) {
        logger.error({ event: 'reel_bgm_failed', reelId, error: audioError.message });
        throw new Error(`Audio Mixing Failed: ${audioError.message}`);
      }

      // 5. Save to public uploads
      const publicFilename = `reel_${reelId}_${Date.now()}.mp4`;
      const publicDir = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'reels');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      const publicFilePath = path.join(publicDir, publicFilename);
      fs.copyFileSync(finalVideoPath, publicFilePath);

      const videoUrl = `/uploads/reels/${publicFilename}`;

      // 6. Update reel to READY
      const reel = await prisma.reel.update({
        where: { id: reelId },
        data: { status: 'READY', videoUrl, metadata: generationMetadata },
      });

      // 7. Auto-create a Post for social publishing if channels were selected
      const channels: string[] = JSON.parse(reel.socialChannels || '[]');
      if (channels.length > 0) {
        try {
          const { postingEngine } = await import('../services/posting-engine.service.js');
          const videoBuffer = fs.readFileSync(publicFilePath);
          
          // Safe-guard the schedule time. It must be at least 1 min in the future to pass scheduler constraints.
          const scheduledTime = reel.scheduledFor ? new Date(reel.scheduledFor) : null;
          const minDelayMs = 60 * 1000 + 5000; // 1 minute + 5s buffer
          const isSafeFuture = scheduledTime && (scheduledTime.getTime() - Date.now() >= minDelayMs);

          // Resolve internal UUIDs to normalized platform names
          const resolvedPlatforms = new Set<string>();
          const accountIds: string[] = [];
          
          for (const channel of channels) {
            const trimmed = channel.trim();
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
            if (isUuid) {
              accountIds.push(trimmed);
            } else {
              resolvedPlatforms.add(trimmed.toUpperCase());
            }
          }
          
          if (accountIds.length > 0) {
            const dbAccounts = await prisma.socialAccount.findMany({
              where: {
                id: { in: accountIds },
                userId: series.userId
              },
              select: {
                platform: true
              }
            });
            for (const acc of dbAccounts) {
              resolvedPlatforms.add(acc.platform.toString().toUpperCase());
            }
          }
          const mappedPlatforms = Array.from(resolvedPlatforms);
          
          if (mappedPlatforms.length > 0) {
            console.log(`[Worker] Auto-posting/scheduling reel for platforms: ${JSON.stringify(mappedPlatforms)}`);
            // Build platform options - reels are vertical 9:16 and should be posted as REEL/SHORTS type
            const platformOptions: Record<string, any> = {};
            for (const plat of mappedPlatforms) {
              // Reels are vertical 9:16; set appropriate post types for each platform
              if (plat === 'INSTAGRAM' || plat === 'FACEBOOK') {
                platformOptions[plat] = { postType: 'REEL', autoFix: true };
              } else if (plat === 'YOUTUBE') {
                platformOptions[plat] = { postType: 'SHORTS', autoFix: true };
              } else {
                platformOptions[plat] = { autoFix: true };
              }
            }
            
            const scheduleResult = await postingEngine.schedulePost(series.userId, {
              content: script.substring(0, 2000),
              media: [{
                file: videoBuffer,
                type: 'video',
                originalName: publicFilename
              }],
              platforms: mappedPlatforms,
              timezone: 'UTC',
              scheduledAt: isSafeFuture && scheduledTime ? scheduledTime.toISOString() : undefined,
              platformOptions
            });

            const newReelStatus = isSafeFuture ? 'SCHEDULED' : 'PUBLISHING';
            await prisma.reel.update({
              where: { id: reelId },
              data: {
                status: newReelStatus,
                metadata: generationMetadata,
                postId: scheduleResult.postId,
                statusMessage: isSafeFuture 
                  ? `Scheduled to post on ${scheduledTime.toISOString()}` 
                  : 'Reel is being published to channels...'
              }
            });

            logger.info({ event: 'reel_post_queued', reelId, postId: scheduleResult.postId, platforms: mappedPlatforms, isScheduled: !!isSafeFuture });
          } else {
            logger.warn({ event: 'reel_post_skip_no_platforms', reelId, reason: 'No connected accounts matched the selected channels' });
            // Even if no platforms matched, set status to READY (unposted)
            await prisma.reel.update({
              where: { id: reelId },
              data: {
                status: 'READY',
                metadata: generationMetadata,
                statusMessage: 'No connected accounts matched the selected channels.'
              }
            });
          }
        } catch (postError: any) {
          logger.error({ event: 'reel_post_queue_failed', reelId, error: postError.message });
          await prisma.reel.update({
            where: { id: reelId },
            data: {
              status: 'FAILED',
              statusMessage: `Failed to schedule publishing: ${postError.message}`
            }
          });
        }
      }

      // 8. Chain and schedule the next recurring Reel in the series if active
      if (series.isActive) {
        try {
          await scheduleNextReel(series.id);
        } catch (scheduleErr: any) {
          logger.error({ event: 'reel_chain_scheduling_failed', seriesId: series.id, error: scheduleErr.message });
        }
      }

      return { success: true, videoUrl };
    } catch (error: any) {
      logger.error({ event: 'reel_generation_error', reelId, error: error.message, stack: error.stack });
      await prisma.reel.update({
        where: { id: reelId },
        data: { 
          status: 'FAILED',
          statusMessage: error.message.substring(0, 150) // Save the real error for the UI
        },
      });
      throw error;
    } finally {
      // Clean up all intermediate temp files proactively
      logger.info({ event: 'reel_cleanup_started', reelId, totalFiles: tempFilesToCleanup.length });
      const uniqueFiles = Array.from(new Set(tempFilesToCleanup));
      for (const filePath of uniqueFiles) {
        try {
          if (filePath && fs.existsSync(filePath)) {
            // Guard: Never delete the final exposed public upload video asset
            if (!filePath.includes('/frontend/public/uploads/reels/')) {
              fs.unlinkSync(filePath);
              logger.debug({ event: 'reel_cleanup_success', filePath });
            }
          }
        } catch (cleanupErr: any) {
          logger.error({ event: 'reel_cleanup_failed', filePath, error: cleanupErr.message });
        }
      }
    }
  }

  public async start() {
    logger.info({ event: 'reel_worker_started' });
    await this.worker.waitUntilReady();
  }

  public async shutdown() {
    await this.worker.close();
    logger.info({ event: 'reel_worker_shutdown' });
  }
}

export const reelWorker = new ReelWorker();
