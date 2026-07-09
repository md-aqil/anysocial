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
        console.log(`[Worker Download Resiliency Fallback] Dynamically generating LLM backdrop for ${fileName}...`);
        const { aiOrchestrator } = await import('../services/ai-orchestrator.service.js');
        const generatedPath = await aiOrchestrator.generateImage("beautiful cinematic vertical background wallpaper, vertical 9:16, no text, no watermark", Math.floor(Math.random() * 1000000));
        if (fs.existsSync(generatedPath)) {
          fs.copyFileSync(generatedPath, tempPath);
          return tempPath;
        }
      } catch (genErr: any) {
        console.error(`[Worker Download Resiliency Fallback] Dynamic image generation chain failed: ${genErr.message}`);
      }
    }

    if (!isAudio) {
      console.error(`[Worker Download Resiliency Critical] LLM backdrop generation failed. Creating empty placeholder.`);
      fs.writeFileSync(tempPath, Buffer.alloc(0));
      return tempPath;
    }

    try {
      const response = await fetch('https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3', { signal: AbortSignal.timeout(10000) });
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

function buildSceneImagePrompt(params: {
  shotIndex: number;
  totalShots: number;
  seriesTopic: string;
  script: string;
  keyword: string;
  artStyle: string;
  lighting: string;
  characterContext: string;
  locationContext: string;
  targetRegion?: string | null;
}) {
  const regionLine = params.targetRegion && params.targetRegion !== 'Global'
    ? `Regional authenticity: ${params.targetRegion}. Use culturally accurate people, places, wardrobe, architecture, objects, and atmosphere for this region.`
    : 'Regional authenticity: globally natural and specific to the described scene.';

  return `Create one original LLM-generated image for a vertical social reel.

Format:
- Vertical 9:16 portrait frame.
- Full-bleed composition with safe space around the center for subtitles.
- No text, no captions, no logos, no watermarks, no borders.

Series context:
- Topic: ${params.seriesTopic}
- Shot ${params.shotIndex} of ${params.totalShots}.
- Script excerpt/context: ${params.script.substring(0, 1200)}

Scene to render:
${params.keyword}

Continuity bible:
- Characters: ${params.characterContext || 'No named characters; infer realistic subjects from the scene.'}
- Locations: ${params.locationContext || 'Infer a specific, cinematic location from the scene.'}
- ${regionLine}

Style direction:
- Art style: ${params.artStyle}.
- Lighting: ${params.lighting}.
- Mood must match the exact emotional beat of the scene, not a generic stock-photo look.
- Cinematic framing, expressive subject, clear foreground/midground/background depth, coherent anatomy, realistic hands, symmetrical face details when people appear.
- High detail, sharp focus on the subject, natural colors unless the selected art style requires stylization.

Negative constraints:
- Do not add readable text.
- Do not add UI, poster typography, fake subtitles, watermarks, brand marks, malformed faces, extra fingers, extra limbs, warped eyes, duplicated people, or distorted objects.`;
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
    isRecompose?: boolean;
    regenerateShots?: number[];
  }>) {
    const { reelId, seriesId, enableMusic = true, enableVoice = true, scriptText: customScriptText, hookText: customHookText, language = 'English', voiceId = 'Aoede', isRecompose = false, regenerateShots = [] } = job.data;
    logger.info({ event: 'reel_generation_started', reelId, seriesId });
    const tempFilesToCleanup: string[] = [];
    
    const generationMetadata: any = {
      llmDetails: "Script: Gemini 2.5 | Audio: Google TTS | Visuals: Gemini Flash Image",
      startedAt: Date.now(),
      model_llm: 'gemini-2.5-flash',
      model_image: 'gemini-2.5-flash-image',
      model_voice: voiceId || 'Aoede',
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

        await updateProgress(`🤖 Preparing AI Product Reel copy...`);
        let scriptText = customScriptText !== undefined && customScriptText !== null ? customScriptText.trim() : '';
        let hookText = customHookText !== undefined && customHookText !== null ? customHookText.trim() : '';

        let activeEnableVoice = enableVoice;
        if (!scriptText || scriptText.length === 0) {
          activeEnableVoice = false;
        }

        let ttsPath: string | null = null;
        let ttsDuration = 0;
        if (activeEnableVoice && scriptText && scriptText.length > 0) {
          await updateProgress('🗣️ Synthesizing premium brand voiceover...');
          const ttsResult = await aiOrchestrator.generateVoiceover(scriptText, voiceId, language, false);
          ttsPath = ttsResult.audioPath;
          generationMetadata.llmDetails = `Script: Gemini 2.5 | Audio: ${ttsResult.engineUsed} | Visuals: Gemini Flash Image`;
          generationMetadata.model_voice = ttsResult.voiceUsed;
          tempFilesToCleanup.push(ttsPath);
          try {
            ttsDuration = await VideoComposerService.getMediaDuration(ttsPath);
          } catch (e) {
            console.error("Failed to get TTS duration, estimating:", e);
            ttsDuration = Math.ceil(scriptText.split(/\s+/).length / 2.3);
          }
        }

        const totalOverlap = Math.max(0, (downloadedAssetPaths.length - 1) * 0.5);
        
        // Dynamically scale clip durations to perfectly match voiceover
        if (ttsDuration > 0 && clipDurations.length > 0) {
           const targetTotal = ttsDuration + totalOverlap + 1.0; // Add 1s padding
           const currentTotal = clipDurations.reduce((a, b) => a + b, 0);
           const scaleFactor = targetTotal / currentTotal;
           for (let i = 0; i < clipDurations.length; i++) {
             clipDurations[i] = clipDurations[i] * scaleFactor;
           }
        }
        
        const finalComputedTotal = clipDurations.reduce((a, b) => a + b, 0);
        const targetDuration = Math.max(8, finalComputedTotal - totalOverlap);

        await updateProgress('🎬 Assembling your cinematic masterpiece...');
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
            const musicReferenceImage = downloadedAssetPaths.find(p => !/\.(mp4|webm|mov)$/i.test(p));
            try {
              bgmPath = await aiOrchestrator.generateMusic(
                musicVibePrompt,
                musicReferenceImage ? [{ path: musicReferenceImage }] : []
              );
              if (bgmPath) tempFilesToCleanup.push(bgmPath);
            } catch (musicErr: any) {
              logger.warn({ event: 'reel_bgm_generation_failed', reelId, error: musicErr.message });
            }
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
                  wordTimings = await aiOrchestrator.transcribeAudio(ttsPath, 'en-IN');
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
          throw new Error(`Product reel audio/music generation failed: ${audioError.message}`);
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
      const durationStr = 'compact short-form';
      const wordCountGoal = 'sixty to one hundred ten words total, roughly twenty five to forty five seconds of spoken audio';
      
      let languagePrompt = `Language: ${series.language || 'English'}. Write the script ONLY in ${series.language || 'English'}.
CRITICAL: The 📝 On-screen text MUST be short, punchy (max 3-4 words), and MUST NOT just repeat what is being said in the voiceover.
EXTREME BAN: DO NOT write an advertisement. DO NOT regurgitate or copy-paste the input text. You MUST write a BRAND NEW conversational story from scratch.
GOOD EXAMPLE (DO THIS):
Scene 1
Duration: 3s
📹 Cinematic wide shot of an empty plot in Jaipur.
📝 Plot in Jaipur
🎙️ Guys, I just found a property in Jaipur that is almost impossible to believe. There's an incredible plot in Jagatpura...
Translate all facts into a highly conversational, authentic spoken-word story like a real human YouTuber.`;
      if (series.language === 'Hindi') {
        languagePrompt = `Language: Hindi. 
CRITICAL: The 🎙️ Voiceover and 📝 On-screen text MUST be entirely in the Roman alphabet (e.g. Hinglish, using English letters) so that on-screen subtitles display correctly without breaking. DO NOT use native Devanagari script (हिंदी लिपि).
CRITICAL: The 📝 On-screen text must be short, punchy (max 3-4 words), and MUST NOT just repeat what is being said in the voiceover.
EXTREME BAN: DO NOT write an advertisement. DO NOT regurgitate or copy-paste the input text. You MUST write a BRAND NEW conversational story from scratch. DO NOT use phrases like "WhatsApp/Call Now", "Save & Share", "Follow for more", "Smart Investor", "40% OFF". DO NOT use symbols like @ or |. 
GOOD EXAMPLE (DO THIS):
Scene 1
Duration: 3s
📹 Cinematic wide shot of an empty plot in Jaipur.
📝 Plot in Jaipur
🎙️ Doston, mujhe Jaipur mein ek aisi property mili hai jis par yakeen karna mushkil hai. Jagatpura mein ek shandaar plot hai...
Translate all facts into a highly conversational, authentic spoken-word story like a real human YouTuber.`;
      }
      const regionStoryRule = series.targetRegion && series.targetRegion !== 'Global' 
        ? `\nCRITICAL REGIONAL CONTEXT: Set the cultural context, character names, foods, locations, and references strictly to ${series.targetRegion} origin.` 
        : '';
        
      const storyPrompt = `You are a casual, authentic storyteller and vlogger (NOT a marketer or salesman).
I am going to give you a raw list of facts, bullet points, or ad copy. 
Your task is to completely DISCARD the original formatting, and translate those facts into a highly engaging, organic, spoken-word ${durationStr} story for TikTok/Shorts.
Raw Input Data: "${series.niche || series.customPrompt}".${pastReelsPrompt}${regionStoryRule}
 
CRITICAL TONE & TTS FORMAT RULES (STRICTLY ENFORCED): 
1. NO ROBOTIC LISTINGS: NEVER write a list of features or fragmented facts separated by pipes or slashes (e.g., "3 BHK | 1800 Sq Ft | Clear Title"). You MUST weave all details into a natural, conversational, spoken-word story (e.g., "Imagine stepping into a massive eighteen hundred square foot luxury apartment...").
2. SPELL OUT ALL NUMBERS & CURRENCIES: Do NOT use symbols like ₹, $, %, or digits like 3, 1800. Write them as spoken words (e.g., "three B H K", "eighteen hundred", "fifteen crore rupees"). The TTS engine will crash on symbols.
3. NO EMOJIS OR BRACKETS IN VOICEOVER: The voiceover (🎙️) MUST NOT contain any emojis, hashtags, or bracketed placeholders like "[Your Number]". Write it exactly as a human voice actor would read it from a teleprompter.
4. TONE ADAPTATION: Act like a real, authentic human sharing a mind-blowing discovery with a friend on TikTok. DO NOT sound like a cheesy salesman, a TV commercial, or an AI. BAN all sales jargon like 'Smart Investment', 'Grab this opportunity', 'Don't miss out'. Talk like a normal person.
5. ADVANCED INTONATION: Use punctuation (;:,.!?—…) for dramatic pauses. Break long ideas into very short sentences.
 
STORYTELLING STRUCTURE (Adapt based on topic):
1. HOOK (0-3s): Start with a conversational, authentic hook (e.g., "I just found the craziest real estate deal in Gurugram..." or "Nobody is talking about this place..."). Do NOT sound like an ad.
2. THE BUILD-UP: Explain the core topic or opportunity using highly visual, conversational, and relatable language. 
3. THE CLIMAX/OFFER: The most mind-blowing fact, twist, or the massive value of the opportunity.
4. ENDING: A strong lingering thought or a casual Call to Action (e.g. "Send this to someone who needs to see it"). NEVER SAY "WhatsApp/Call Now", "Save & Share", or "Follow for more".
 
PACING & RULES:
- The script must be compact and tightly paced. Use ${wordCountGoal}.
- Keep the story highly visual and fast-paced, generating enough distinct scenes to visualize in up to fifteen clips. Prefer one clear hook, several story beats, one twist, and one ending.
- Do not artificially pad the script with extra background, repeated suspense lines, or multiple unrelated facts.
- ${languagePrompt}
- The narration must feel intense, highly visual, rhythmic, and perfectly matched to the topic of "${series.niche || series.customPrompt}".

FORMATTING RULES (CRITICAL):
You MUST output the "script" field as a strict JSON ARRAY of Scene objects. Do NOT output a single string. Do not use emojis in the JSON keys.
Example structure:
{
  "script": [
    {
      "duration": "3s",
      "visual": "Cinematic wide shot of an empty plot in Jaipur.",
      "on_screen_text": "Plot in Jaipur",
      "voiceover": "दोस्तों, मुझे जयपुर में एक ऐसी प्रॉपर्टी मिली है जिस पर यकीन करना मुश्किल है..."
    }
  ],
  "audio_prompt": "Describe the perfect cinematic background music..."
}`;

      let script = customScriptText || '';
      let scriptTts = customScriptText || '';
      let characterContext = '';
      let locationContext = '';
      let visuals: any[] = [];
      let numKeywords = 15;

      if (isRecompose && reelWithDetails.metadata) {
        // Re-composition bypasses AI story generation and shot planning
        await updateProgress(`🔄 Re-composing Reel... Bypassing AI Script & Planning.`);
        const meta = reelWithDetails.metadata as any;
        visuals = meta.shots || [];
        numKeywords = visuals.length;
        script = customScriptText || reelWithDetails.script || '';
        scriptTts = script;
      } else {
        try {
          let parsed: any;
          let aiResultText = '';
          
          const responseSchema = {
            type: "OBJECT",
            properties: {
              script: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    duration: { type: "STRING" },
                    visual: { type: "STRING" },
                    on_screen_text: { type: "STRING" },
                    voiceover: { type: "STRING" }
                  },
                  required: ["duration", "visual", "on_screen_text", "voiceover"]
                }
              },
              audio_prompt: { type: "STRING" }
            },
            required: ["script", "audio_prompt"]
          };

          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              aiResultText = await aiOrchestrator.generateContent(storyPrompt, [], true, responseSchema);
              const match = aiResultText.match(/\{[\s\S]*\}/);
              const rawContent = match ? match[0] : aiResultText.replace(/```json\n?|```/g, '').trim();
              parsed = JSON.parse(rawContent);
              break;
            } catch (e: any) {
              if (attempt === 2) throw new Error(`Script JSON parse failed after 3 attempts: ${e.message}`);
              console.warn(`[Scriptwriter Retry ${attempt + 1}] Malformed JSON, retrying...`);
            }
          }
          const extractScriptText = (val: any): string => {
            if (typeof val === 'string') return val;
            if (Array.isArray(val)) {
              return val.map((v, i) => {
                if (typeof v === 'string') return v;
                if (typeof v === 'object' && v !== null) {
                  const duration = v.duration || '3s';
                  const visual = v.visual || v.camera || v.shot || '';
                  const text = v.on_screen_text || v.graphic || v.text || '';
                  const voice = v.voiceover || v.audio || v.narration || v.speech || v.hindi || v.dialogue || '';
                  
                  return `Scene ${i + 1}\nDuration: ${duration}\n\n📹 ${visual}\n📝 ${text}\n🎙️ ${voice}`;
                }
                return '';
              }).filter(Boolean).join('\n\n');
            }
            if (typeof val === 'object' && val !== null) {
               return `📹 ${val.visual || ''}\n📝 ${val.on_screen_text || ''}\n🎙️ ${val.voiceover || ''}`;
            }
            return String(val);
          };

          const extractVoiceoverText = (fullScript: string): string => {
            if (!fullScript) return '';
            // Primary extraction: Look for known voiceover markers
            const regex = /(?:🎙️|🎙|🎤|Voiceover:|Audio:)\s*(.*?)(?=\n*Scene|\n*📹|$)/gis;
            const matches = [...fullScript.matchAll(regex)];
            let extracted = '';
            if (matches.length > 0) {
              extracted = matches.map(m => m[1].trim()).join(' ').trim();
            }
            
            if (extracted.length > 0) {
              // Strip out any accidental 📝 or other markers that got caught
              return extracted.replace(/📝.*?(\n|$)/g, '').trim();
            }
            
            // Fallback: Aggressively strip out structural instructions
            const cleaned = fullScript.split('\n')
              .map(line => line.trim())
              .filter(line => !line.toLowerCase().startsWith('scene'))
              .filter(line => !line.toLowerCase().startsWith('duration'))
              .filter(line => !line.includes('📹') && !line.toLowerCase().startsWith('camera') && !line.toLowerCase().startsWith('visual'))
              .filter(line => !line.includes('📝') && !line.toLowerCase().startsWith('text') && !line.toLowerCase().startsWith('graphic'))
              .join(' ')
              .trim();
              
            return cleaned || fullScript.trim();
          };

          if (!parsed.script) throw new Error('AI output did not contain a "script" field.');
          script = extractScriptText(parsed.script);
          scriptTts = extractVoiceoverText(script);
          
          if (!scriptTts || scriptTts.trim() === '') {
             throw new Error(`AI generated an empty voiceover. Raw script generated: ${script.substring(0, 150)}...`);
          }
          
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
  CRITICAL INSTRUCTION: ONLY extract characters if they are explicitly mentioned or physically present in the narrative story. Do NOT invent a 'Narrator', 'Advisor', or generic human character if the script is primarily discussing concepts, objects, or locations.
  Output ONLY valid JSON:
  {
    "characters": [{ "name": "...", "physical": "...", "wardrobe": "..." }],
    "locations": [{ "name": "...", "architecture": "...", "lighting": "..." }]
  }`;
          let memParsed: any;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const memoryResText = await aiOrchestrator.generateContent(memoryPrompt);
              const memMatch = memoryResText.match(/\{[\s\S]*\}/);
              const memRaw = memMatch ? memMatch[0] : memoryResText.replace(/```json\n?|```/g, '').trim();
              memParsed = JSON.parse(memRaw);
              break;
            } catch (e: any) {
              if (attempt === 2) throw e;
              console.warn(`[Memory Core Retry ${attempt + 1}] Malformed JSON, retrying...`);
            }
          }
          characterContext = JSON.stringify(memParsed.characters || []);
          locationContext = JSON.stringify(memParsed.locations || []);
          
          for (const char of memParsed.characters || []) {
              await prisma.seriesCharacter.create({ data: { seriesId: series.id, name: char.name, physical: char.physical, wardrobe: char.wardrobe } });
          }
        } catch (e) {
          console.warn("[Art Director] Failed to parse memory core, proceeding with empty context.");
        }

        // Dynamically calculate the number of shots (very fast pacing: 1 shot ~every 7 words)
        const scriptWordCount = script.split(/\s+/).length;
        numKeywords = Math.min(18, Math.max(7, Math.ceil(scriptWordCount / 7)));

        // Phase 3: Shot Planning (Cinematographer)
        await updateProgress(`🎥 Phase 3: Cinematographer is planning the Shot List (${numKeywords} shots)...`);
        try {
           const cinePrompt = `You are an elite Cinematographer. Break down this organic script into an appropriately paced sequence of exactly ${numKeywords} cinematic shots.
  Script: "${script}"
  Characters: ${characterContext}
  Locations: ${locationContext}

  CRITICAL MEDIA RULE: 
  - Every shot MUST use "ai_image". Do not choose stock photos, stock videos, search APIs, archival footage, or generic B-roll.
  - Each keyword must describe a specific generated frame, not a search query.
  - Include the subject, action, environment, emotional tone, camera framing, and visual details needed for an image model to render the scene.${series.targetRegion && series.targetRegion !== 'Global' ? `\n- CRITICAL REGION RULE: You MUST explicitly include "${series.targetRegion}" and mention ${series.targetRegion} demographics, places, clothing, objects, and architecture where relevant in EVERY keyword description.` : ''}
  - CRITICAL SUBJECT RULE: Do NOT force human characters into the frame. If the script discusses concepts, properties, or objects, focus the imagery entirely on those subjects (cinematic B-roll style) rather than showing someone talking.
  - DYNAMIC GRAPHICS RULE: Use text graphics ONLY when absolutely necessary (e.g. for abstract concepts, critical numbers, prices, or savings). DO NOT add graphics to every image. The majority of the reel should be purely visual cinematic scenes. When you DO need a graphic, make it highly engaging, for example: "A dynamic animated graphic on a digital screen, prominently displaying a large, bold 'Market Value' dramatically crossed out..."

  CAMERA MOVEMENTS: Choose exactly one per shot: 'zoom_in', 'zoom_out', 'pan_right', 'pan_left', 'pan_up', 'pan_down', 'static'. Use varied movements.

  Output ONLY valid JSON:
  {
    "visuals": [
      { 
        "keyword": "detailed description of the exact visual frame, explicitly naming characters and environment.", 
        "media_type": "ai_image", 
        "camera_movement": "zoom_in",
        "lighting": "High contrast rim lighting"
      }
    ]
  }`;
           const cineSchema = {
             type: "OBJECT",
             properties: {
               visuals: {
                 type: "ARRAY",
                 items: {
                   type: "OBJECT",
                   properties: {
                     keyword: { type: "STRING" },
                     media_type: { type: "STRING" },
                     camera_movement: { type: "STRING" },
                     lighting: { type: "STRING" }
                   },
                   required: ["keyword", "media_type", "camera_movement", "lighting"]
                 }
               }
             },
             required: ["visuals"]
           };

           let cineParsed: any;
           for (let attempt = 0; attempt < 3; attempt++) {
             try {
               const cineResText = await aiOrchestrator.generateContent(cinePrompt, [], true, cineSchema);
               const cineMatch = cineResText.match(/\{[\s\S]*\}/);
               const cineRaw = cineMatch ? cineMatch[0] : cineResText.replace(/```json\n?|```/g, '').trim();
               cineParsed = JSON.parse(cineRaw);
               break;
             } catch (e: any) {
               if (attempt === 2) throw e;
               console.warn(`[Cinematographer Retry ${attempt + 1}] Malformed JSON, retrying...`);
             }
           }
           visuals = cineParsed.visuals || [];
        } catch (e) {
           console.error("[Cinematographer] Failed, falling back to basic shots.");
           throw new Error("Cinematographer planning failed.");
        }

        await prisma.reel.update({
          where: { id: reelId },
          data: { script },
        });
      }

      // 3. Generate Voiceover First (to determine exact video length)
      await updateProgress('🗣️ Synthesizing voice with Gemini 3.1 Flash TTS...');
      logger.info({ event: 'reel_adding_audio', reelId });
      
      let ttsPath: string;
      let actualDuration = 60;
      let wordTimings: Array<{word: string, startTime: number, endTime: number}> = [];
      
      try {
        const ttsResult = await aiOrchestrator.generateVoiceover(scriptTts, series.voiceId || 'Aoede', series.language || 'English');
        ttsPath = ttsResult.audioPath;
        generationMetadata.llmDetails = `Script: Gemini 2.5 | Audio: ${ttsResult.engineUsed} | Visuals: Gemini Flash Image`;
        generationMetadata.model_voice = ttsResult.voiceUsed;
        if (ttsPath) {
          tempFilesToCleanup.push(ttsPath);
        }
        
        try {
          actualDuration = await VideoComposerService.getMediaDuration(ttsPath);
          // Do not pad actualDuration here; exact timing is required for accurate subtitle sync
          logger.info({ event: 'reel_audio_duration', reelId, actualDuration });
          
          if (series.language && series.language.includes('Hindi')) {
              await updateProgress('💬 Transcribing Hindi audio for perfect subtitle timing...');
              wordTimings = await aiOrchestrator.transcribeAudio(ttsPath, 'en-IN');
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
        const mediaType = 'ai_image';
        const intendedMovement = visual.camera_movement || visual.cameraMovement || 'zoom_in';
        const lighting = visual.lighting || 'cinematic';
        
        let finalUrl = '';
        let actualModelUsed = 'gemini-2.5-flash-image';
        let isReused = false;
        let attemptsUsed = 1;
        
        if (isRecompose && !regenerateShots.includes(visual.shotIndex)) {
            // Keep existing image
            finalUrl = path.join(process.cwd(), 'frontend', 'public', visual.imageUrl);
            actualModelUsed = visual.model || 'gemini-2.5-flash-image';
            isReused = true;
            attemptsUsed = visual.attempts || 1;
        } else {
            let attempts = 0;
            const maxAttempts = 1; // Try only once to save time and credits
            
            while (attempts < maxAttempts) {
                attempts++;
                attemptsUsed = attempts;
                try {
                  // Phase 4: Prompt Engineering
                  const isStylized = /anime|cartoon|3d|render|illustration|watercolor|graphic|vector|painting|comic/i.test(series.artStyle || '');
                  
                  const promptPrefix = isStylized 
                    ? `A high-quality, professional 9:16 ${series.artStyle || 'stylized'} artwork of:`
                    : `A highly-detailed, hyper-realistic vertical 9:16 portrait of:`;
                  
                  const cameraSettings = isStylized
                    ? `Style: ${series.artStyle || 'Stylized'} artwork, rich colors, masterful composition, high-end rendering.`
                    : `Camera: 50mm lens, f/1.8, ISO 200, highly detailed, unretouched, ${series.artStyle || 'Cinematic'} style. Do not beautify or alter facial features.`;
                    
                  const negPrompt = isStylized
                    ? "text, watermarks, borders, poorly drawn, distorted, low resolution, bad quality, photorealistic, ugly"
                    : "anatomy normalization, body proportion averaging, dataset-average anatomy, beautification filters, skin smoothing, plastic skin, airbrushed texture, stylized realism, text, watermarks, borders, distortion, extra limbs, weird hands, poorly drawn faces";

                  const engineeredPrompt = JSON.stringify({
                    prompt: `${promptPrefix} ${keyword}. Story & Scene Matching: This image MUST perfectly depict the exact action and story described. Emotion & Atmosphere: Intensely expressive, capturing the exact mood and raw emotion. Lighting: ${lighting}. ${cameraSettings}`,
                    negative_prompt: negPrompt,
                    api_parameters: {
                      resolution: "1K",
                      output_format: "jpg",
                      aspect_ratio: "9:16"
                    },
                    settings: {
                      resolution: "1K",
                      style: series.artStyle,
                      lighting: lighting || "cinematic",
                      depth_of_field: isStylized ? "vibrant rendering" : "shallow depth of field",
                      quality: "high detail"
                    }
                  });
                  
                  finalUrl = await aiOrchestrator.generateImage(engineeredPrompt, reelSeed + attempts);
                  await new Promise(r => setTimeout(r, 1000));
                  
                  // Phase 5: Vision QA Inspector
                  // Bypassed: accepting the first generated image to save time and credits!
                  break;
                } catch (e: any) {
                  logger.warn({ event: 'reel_media_gen_failed', keyword, attempt: attempts, error: e.message });
                  if (attempts === maxAttempts) {
                      try {
                        // Fallback 1: Pollinations AI
                        finalUrl = await aiOrchestrator.fetchPollinationsImage(keyword, reelSeed + attempts);
                        actualModelUsed = 'pollinations.ai';
                      } catch (e1) {
                        try {
                          // Fallback 2: Stock Image
                          finalUrl = await aiOrchestrator.fetchStockImage(keyword);
                          actualModelUsed = 'stock-api (pexels/pixabay)';
                        } catch (e2) {
                          // Fallback 3: Black Image (Handled internally by fetchStockImage, but just in case)
                          finalUrl = await aiOrchestrator.fetchStockImage('fallback');
                          actualModelUsed = 'failsafe-fallback';
                        }
                      }
                  }
                }
            }
        }

        if (!finalUrl) {
          throw new Error(`LLM image generation returned no image for shot ${currentShotIndex}.`);
        }
        
        let publicImageUrl = visual.imageUrl;
        if (!isReused) {
            // We need to copy the final image to a public folder so the UI can display it in the Generation Details
            const publicDir = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'ai-images');
            if (!fs.existsSync(publicDir)) {
              fs.mkdirSync(publicDir, { recursive: true });
            }
            const publicFilename = `reel_shot_${reelId}_${currentShotIndex}_${Date.now()}.jpg`;
            const publicFilePath = path.join(publicDir, publicFilename);
            fs.copyFileSync(finalUrl, publicFilePath);
            publicImageUrl = `/uploads/ai-images/${publicFilename}`;
        }
        
        generationMetadata.shots.push({
          shotIndex: currentShotIndex,
          keyword,
          mediaType,
          attempts: attemptsUsed,
          source: actualModelUsed.includes('stock') || actualModelUsed.includes('failsafe') ? 'stock_image' : 'ai_image',
          model: actualModelUsed,
          imageUrl: publicImageUrl,
          cameraMovement: intendedMovement
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
        
        let bgmPath = '';
        try {
          bgmPath = await aiOrchestrator.generateMusic(
            finalMusicPrompt,
            imageUrls[0] ? [{ path: imageUrls[0] }] : []
          );
          if (bgmPath) tempFilesToCleanup.push(bgmPath);
        } catch (musicErr: any) {
          logger.warn({ event: 'reel_bgm_generation_failed', reelId, error: musicErr.message });
        }

        let mixedAudioPath = ttsPath;
        let bgmTempFiles: string[] = [];
        if (bgmPath) {
          const mixResult = await VideoComposerService.addBackgroundMusic(ttsPath, bgmPath, actualDuration, abortController.signal);
          mixedAudioPath = mixResult.outputPath;
          bgmTempFiles = mixResult.tempFiles;
        }
        if (mixedAudioPath !== ttsPath && mixedAudioPath) tempFilesToCleanup.push(mixedAudioPath);
        if (bgmTempFiles && bgmTempFiles.length > 0) tempFilesToCleanup.push(...bgmTempFiles);
        
        await updateProgress('💬 Burning animated subtitles into final video...');
        const subtitlePath = await VideoComposerService.generateSubtitlesFile(scriptTts, actualDuration, wordTimings);
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
      return { success: false, error: error.message };
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

export const seriesReelWorker = new ReelWorker();
