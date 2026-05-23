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

async function downloadToTemp(url: string, fileName: string): Promise<string> {
  const tempPath = path.join(os.tmpdir(), fileName);
  try {
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

  private async processJob(job: Job<{ reelId: string; seriesId: string }>) {
    const { reelId, seriesId } = job.data;
    logger.info({ event: 'reel_generation_started', reelId, seriesId });
    const tempFilesToCleanup: string[] = [];

    try {
      // 1. Update status to GENERATING
      const updateProgress = async (msg: string) => {
        logger.info({ event: 'reel_progress', reelId, message: msg });
        await prisma.reel.update({
          where: { id: reelId },
          data: { status: 'GENERATING', statusMessage: msg },
        });
      };
      
      await updateProgress('🚀 Initializing Premium AI Engine...');

      const series = await prisma.reelSeries.findUniqueOrThrow({
        where: { id: seriesId },
        include: { user: true }
      });

      // 2. Generate Script using Vertex AI (Gemini)
      await updateProgress('✍️ Writing cinematic script with Gemini 3.1 Pro...');
      const durationStr = '1-minute compacted';
      const numKeywords = 8;
      
      const hookText = series.hookType || 'Engaging Hook';
      const toneText = series.tone || 'Cinematic';
      const structureText = series.storyStructure || 'Beginning, Middle, End';
      
      const wordCount = '135 to 150 words';
      
      let languagePrompt = `Language: ${series.language || 'English'}. Write the script ONLY in ${series.language || 'English'}.`;
      if (series.language === 'Hindi') {
        languagePrompt = `Language: Hindi. CRITICAL: You MUST write the entire script exclusively in the Devanagari script (हिंदी लिपि) so the TTS engine pronounces it perfectly. However, the TONE and VOCABULARY should NOT be formal or pure bookish Hindi. Use a natural, everyday mix of Desi Hindi, Urdu words, and common English words (transliterated into Devanagari, e.g., 'टाइम', 'फीलिंग', 'सस्पेंस'), exactly like a modern Indian TikToker or YouTuber speaks. Make it sound highly conversational, natural, and relatable.`;
      }
      
      const scriptPrompt = `You are a TikTok/Reels storyteller. Your task is to write a highly engaging ${durationStr} script about: "${series.niche || series.customPrompt}".
 
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
- The script MUST be exactly ${wordCount} words to fit the video timing.
- ${languagePrompt}
- The narration must feel intense, highly visual, rhythmic, and perfectly matched to the topic of "${series.niche || series.customPrompt}".
 
For the 'keywords' array, generate exactly ${numKeywords} highly detailed image prompts. 
CRITICAL IMAGE RULE: Each image prompt MUST strictly describe the exact visual scene happening in the script at that specific moment. Ensure the visuals match an edgy, cinematic, and modern aesthetic appealing to teenagers, explicitly avoiding any overly childish or babyish imagery. Do not generate random beautiful images; generate exactly what the viewer should see while the narrator is speaking that sentence.
 
Output ONLY valid JSON: 
{
  "script": "...", 
  "keywords": ["detailed image prompt 1", "detailed image prompt 2", ...], 
  "audio_prompt": "Describe the perfect cinematic background music to match the emotional tone and pacing of this story."
}`;

      let script = '';
      let keywords: string[] = [];

      try {
        const aiResultText = await aiOrchestrator.generateContent(scriptPrompt);
        const rawContent = aiResultText.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(rawContent);
        if (!parsed.script) throw new Error('AI output did not contain a "script" field.');
        script = parsed.script;
        keywords = parsed.keywords || ['cinematic', 'trending'];
        // Default to a cinematic sound if the AI doesn't provide an audio prompt
        (series as any).aiMusicPrompt = parsed.audio_prompt;
      } catch (e: any) {
        logger.error({ event: 'reel_ai_script_failed', reelId, error: e.message });
        throw new Error(`AI Script Failed: ${e.message}`);
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
      
      try {
        ttsPath = await aiOrchestrator.generateVoiceover(script, series.voiceId || 'en-US-Journey-F', series.language || 'English');
        if (ttsPath) {
          tempFilesToCleanup.push(ttsPath);
        }
        
        try {
          actualDuration = await VideoComposerService.getMediaDuration(ttsPath);
          actualDuration = Math.ceil(actualDuration) + 1;
          logger.info({ event: 'reel_audio_duration', reelId, actualDuration });
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

      // 4. Generate Images
      await updateProgress(`🎨 Rendering ${numKeywords} visuals with Imagen 3 (${actualDuration}s video)...`);
      logger.info({ event: 'reel_generating_images', reelId });
      
      // Use a consistent seed for all images in this reel to enforce visual consistency
      const reelSeed = Math.floor(Math.random() * 1000000);
      
      const imageUrls: string[] = [];
      for (const keyword of keywords.slice(0, numKeywords)) {
        try {
          const url = await aiOrchestrator.generateImage(`${keyword}, ${series.artStyle} style, identical consistency, highly detailed`, reelSeed);
          imageUrls.push(url);
          await new Promise(r => setTimeout(r, 1000));
        } catch (e: any) {
          logger.warn({ event: 'reel_image_gen_failed', keyword, error: e.message });
          try {
            // Fallback to Stock API chain (Google -> NVIDIA -> Pixabay)
            const stockUrl = await aiOrchestrator.fetchStockImage(keyword);
            imageUrls.push(stockUrl);
          } catch (stockErr) {
            try {
              console.log(`[Worker] Stock chain failed. Trying direct NVIDIA Flux with generic prompt...`);
              const fallbackUrl = await aiOrchestrator.generateNvidiaFluxImage("beautiful vertical scene consistent style", reelSeed);
              imageUrls.push(fallbackUrl);
            } catch (fluxErr: any) {
              try {
                console.log(`[Worker] Direct Flux failed. Trying generic Pixabay...`);
                const pixabayUrl = await aiOrchestrator.fetchPixabayImage("abstract vertical background");
                imageUrls.push(pixabayUrl);
              } catch (pixErr: any) {
                throw new Error("Could not generate or search any fallback image asset");
              }
            }
          }
        }
      }

      // 5. Compose Video using VideoComposerService (FFmpeg)
      logger.info({ event: 'reel_composing_video', reelId });
      const abortController = new AbortController();

      const imageDuration = Math.ceil(actualDuration / numKeywords);
      const { clipPaths, tempFiles: composerTempFiles } = await VideoComposerService.createVideoClips(imageUrls, imageDuration, 'vertical', abortController.signal);
      if (clipPaths) tempFilesToCleanup.push(...clipPaths);
      if (composerTempFiles) tempFilesToCleanup.push(...composerTempFiles);

      const { outputPath: concatVideoPath, tempFiles: concatTempFiles } = await VideoComposerService.concatVideos(clipPaths, abortController.signal);
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
        const subtitlePath = await VideoComposerService.generateSubtitlesFile(script, actualDuration);
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
        data: { status: 'READY', videoUrl },
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
            await postingEngine.schedulePost(series.userId, {
              content: script.substring(0, 2000),
              media: [{
                file: videoBuffer,
                type: 'video',
                originalName: publicFilename
              }],
              platforms: mappedPlatforms,
              timezone: 'UTC',
              scheduledAt: isSafeFuture && scheduledTime ? scheduledTime.toISOString() : undefined,
              platformOptions: {}
            });
            logger.info({ event: 'reel_post_queued', reelId, platforms: mappedPlatforms, isScheduled: !!isSafeFuture });
          } else {
            logger.warn({ event: 'reel_post_skip_no_platforms', reelId, reason: 'No connected accounts matched the selected channels' });
          }
        } catch (postError: any) {
          logger.error({ event: 'reel_post_queue_failed', reelId, error: postError.message });
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
