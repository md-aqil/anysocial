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
      await prisma.reel.update({
        where: { id: reelId },
        data: { status: 'GENERATING' },
      });

      const series = await prisma.reelSeries.findUniqueOrThrow({
        where: { id: seriesId },
        include: { user: true }
      });

      // 2. Generate Script using Vertex AI (Gemini)
      const scriptPrompt = series.niche
        ? `Write a highly engaging, 30-second script for a faceless social media reel about "${series.niche}". The visual art style is "${series.artStyle}". Language: ${series.language}. Write the script in ${series.language}. Also provide 4 highly descriptive image search keywords in English. Return ONLY valid JSON: {"script": "...", "keywords": ["k1","k2","k3","k4"]}`
        : `Write a highly engaging, 30-second script based on: "${series.customPrompt}". Art style: "${series.artStyle}". Language: ${series.language}. Write in ${series.language}. Provide 4 image keywords in English. Return ONLY valid JSON: {"script": "...", "keywords": ["k1","k2","k3","k4"]}`;

      let script = `Welcome to today's story. Stay tuned for something amazing. #${Date.now()}`;
      let keywords = ['cinematic landscape', 'dramatic sky', 'mystery forest', 'epic mountain'];

      try {
        const aiResult = await aiOrchestrator.adaptContent(scriptPrompt, 'INSTAGRAM');
        const parsed = JSON.parse(aiResult.adaptedContent);
        script = parsed.script || script;
        keywords = parsed.keywords || keywords;
      } catch (e: any) {
        logger.warn({ event: 'reel_ai_script_fallback', reelId, error: e.message });
      }

      await prisma.reel.update({
        where: { id: reelId },
        data: { script },
      });

      // 3. Use stock images based on keywords
      const imageUrls = [
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&h=720&fit=crop',
        'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=400&h=720&fit=crop',
        'https://images.unsplash.com/photo-1626278664285-f796b9ee7806?q=80&w=400&h=720&fit=crop',
        'https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=400&h=720&fit=crop'
      ];

      // 4. Compose Video using VideoComposerService (FFmpeg)
      logger.info({ event: 'reel_composing_video', reelId });
      const abortController = new AbortController();

      const { clipPaths } = await VideoComposerService.createVideoClips(imageUrls, 4, 'vertical', abortController.signal);
      const { outputPath: concatVideoPath } = await VideoComposerService.concatVideos(clipPaths, abortController.signal);

      // --- ADD AUDIO (TTS & BGM) ---
      let finalVideoPath = concatVideoPath;
      try {
        logger.info({ event: 'reel_adding_audio', reelId });
        
        // 1. Generate Voiceover TTS
        // Google Translate limits to ~200 chars per request reliably
        const ttsText = script.substring(0, 199);
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(ttsText)}&tl=${series.language || 'en'}&client=tw-ob`;
        const ttsPath = await downloadToTemp(ttsUrl, `tts_${Date.now()}.mp3`);
        
        // 2. Download Background Music
        const bgmUrl = 'https://raw.githubusercontent.com/mdn/webaudio-examples/main/audio-analyser/viper.mp3';
        const bgmPath = await downloadToTemp(bgmUrl, `bgm_${Date.now()}.mp3`);
        
        // 3. Mix TTS and BGM (Assuming ~16 seconds total video length)
        const { outputPath: mixedAudioPath } = await VideoComposerService.addBackgroundMusic(ttsPath, bgmPath, 16, abortController.signal);
        
        // 4. Merge Mixed Audio with Video
        const { outputPath: videoWithAudio } = await VideoComposerService.mergeAudioVideo(concatVideoPath, mixedAudioPath, abortController.signal);
        
        finalVideoPath = videoWithAudio;
      } catch (audioError: any) {
        logger.error({ event: 'reel_audio_failed', reelId, error: audioError.message });
        // Fallback to video without audio if audio processing fails
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
        data: { status: 'FAILED' },
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
