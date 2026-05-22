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

const pipeline = promisify(stream.pipeline);

async function downloadToTemp(url: string, fileName: string): Promise<string> {
  const tempPath = path.join(os.tmpdir(), fileName);
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }});
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to download ${url}: ${response.status} ${text.substring(0, 100)}`);
  }
  
  const fileStream = fs.createWriteStream(tempPath);
  // @ts-ignore
  await pipeline(response.body, fileStream);
  return tempPath;
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

    try {
      // 1. Update status to GENERATING
      const updateProgress = async (msg: string) => {
        logger.info({ event: 'reel_progress', reelId, message: msg });
        await prisma.reel.update({
          where: { id: reelId },
          data: { status: 'GENERATING', statusMessage: msg },
        });
      };
      
      await updateProgress('Initializing AI generation...');

      const series = await prisma.reelSeries.findUniqueOrThrow({
        where: { id: seriesId },
        include: { user: true }
      });

      // 2. Generate Script using Vertex AI (Gemini)
      await updateProgress('Writing script with Gemini 1.5 Pro...');
      const durationStr = '1-minute compacted';
      const numKeywords = 8;
      
      const hookText = series.hookType || 'Engaging Hook';
      const toneText = series.tone || 'Cinematic';
      const structureText = series.storyStructure || 'Beginning, Middle, End';
      
      const wordCount = '135 to 150 words';
      
      let languagePrompt = `Language: ${series.language || 'English'}. Write the script ONLY in ${series.language || 'English'}.`;
      if (series.language === 'Hindi') {
        languagePrompt = `Language: Hindi (Hinglish conversational style). DO NOT use pure, formal, or bookish Hindi. Use a natural, everyday conversational mix of Hindi, Urdu, and common English words—exactly how a modern Indian content creator speaks in real life. Keep it highly relatable and natural.`;
      }
      
      const scriptPrompt = `You are an elite, top-1% TikTok/Reels viral content strategist and master storyteller. 
Your task is to write a highly engaging ${durationStr} script about: "${series.niche || series.customPrompt}".

Apply the following storytelling constraints:
1. HOOK: Use a "${hookText}" hook. The first 3 seconds must be a visceral pattern-interrupt. NEVER use cliché openings like "Did you know", "Welcome back", or "Hey guys". Start directly in the action or with a controversial statement.
2. TONE: The voiceover must be highly emotional, using sensory vocabulary that sounds "${toneText}".
3. STRUCTURE: Follow the "${structureText}" framework. Build intense curiosity in the middle, and resolve the tension right before the end.
4. PACING: The script MUST be exactly ${wordCount}. This is critical for audio timing. Write for spoken word—use short, punchy sentences and conversational rhythm.

Rules:
- ${languagePrompt}
- End with a strong, highly debated question or an open loop to drive algorithmic comments.
- For the 'keywords' array, do NOT just provide simple words. Generate exactly ${numKeywords} highly detailed, cinematic image generation prompts (e.g., "Cinematic low angle shot of a massive ancient pyramid in a sandstorm, hyper-realistic, 8k resolution, dramatic lighting").

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

      // 3. Generate Images using Imagen 3
      await updateProgress(`Generating ${numKeywords} cinematic visuals using Imagen 3...`);
      logger.info({ event: 'reel_generating_images', reelId });
      const imageUrls: string[] = [];
      for (const keyword of keywords.slice(0, numKeywords)) {
        try {
          // Append art style to prompt to ensure consistency
          const url = await aiOrchestrator.generateImage(`${keyword}, ${series.artStyle} style`);
          imageUrls.push(url);
          // Small delay to be extra safe with rate limits
          await new Promise(r => setTimeout(r, 1000));
        } catch (e) {
          imageUrls.push('https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=400&h=720&fit=crop');
        }
      }

      // 4. Compose Video using VideoComposerService (FFmpeg)
      logger.info({ event: 'reel_composing_video', reelId });
      const abortController = new AbortController();

      const imageDuration = Math.ceil(60 / numKeywords);
      const { clipPaths } = await VideoComposerService.createVideoClips(imageUrls, imageDuration, 'vertical', abortController.signal);
      const { outputPath: concatVideoPath } = await VideoComposerService.concatVideos(clipPaths, abortController.signal);

      // --- ADD AUDIO (TTS & BGM) ---
      let finalVideoPath = concatVideoPath;
      try {
        await updateProgress('Synthesizing voiceover and mixing audio tracks...');
        logger.info({ event: 'reel_adding_audio', reelId });
        
        // 1. Generate Voiceover TTS via Google Cloud TTS (Journey Voices or localized)
        const ttsPath = await aiOrchestrator.generateVoiceover(script, series.voiceId || 'en-US-Journey-F', series.language || 'English');
        
        // 2. Generate Background Music via Lyria 3 Pro
        const musicPromptMap: Record<string, string> = {
          'cinematic-ambient': 'Deep, atmospheric cinematic ambient synth pads with a slow, emotional buildup.',
          'dark-suspense': 'Tense, pulsing electronic dark suspense beats suitable for a horror or mystery story.',
          'uplifting-acoustic': 'Light, hopeful acoustic guitar and piano playing a gentle uplifting melody.',
          'lofi-beats': 'Relaxed, warm vintage vinyl lofi hip-hop chill beats with a steady groove.'
        };
        
        // Prioritize the AI-generated story-specific music prompt, then fallback to user selection, then default
        const aiMusicPrompt = (series as any).aiMusicPrompt;
        const fallbackPrompt = (series.musicId && musicPromptMap[series.musicId]) || musicPromptMap['cinematic-ambient'];
        const finalMusicPrompt = aiMusicPrompt || fallbackPrompt;
        
        const bgmPath = await aiOrchestrator.generateMusic(finalMusicPrompt);
        
        // 3. Mix TTS and BGM (Dynamically scale length)
        const estimatedDuration = 60;
        const { outputPath: mixedAudioPath } = await VideoComposerService.addBackgroundMusic(ttsPath, bgmPath, estimatedDuration, abortController.signal);
        
        // 4. Merge Mixed Audio with Video
        await updateProgress('Composing final video frame by frame...');
        const { outputPath: videoWithAudio } = await VideoComposerService.mergeAudioVideo(concatVideoPath, mixedAudioPath, abortController.signal);
        
        finalVideoPath = videoWithAudio;
      } catch (audioError: any) {
        logger.error({ event: 'reel_audio_failed', reelId, error: audioError.message });
        throw new Error(`Audio/Voice Generation Failed: ${audioError.message}`);
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
          const videoBuffer = fs.readFileSync(concatVideoPath);
          
          await postingEngine.schedulePost(series.userId, {
            content: script.substring(0, 2000),
            media: [{
              file: videoBuffer,
              type: 'video',
              originalName: publicFilename
            }],
            platforms: channels.map(c => c.toUpperCase()),
            timezone: 'UTC',
            scheduledAt: reel.scheduledFor && new Date(reel.scheduledFor) > new Date() ? new Date(reel.scheduledFor).toISOString() : undefined,
            platformOptions: {}
          });
          logger.info({ event: 'reel_post_queued', reelId });
        } catch (postError: any) {
          logger.error({ event: 'reel_post_queue_failed', reelId, error: postError.message });
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
