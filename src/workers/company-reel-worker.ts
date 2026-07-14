/**
 * Company Reel Worker
 * ─────────────────────────────────────────────────────────────────────
 * Completely separate BullMQ worker for B2B Company Reel generation.
 * Flow:
 *   1. Pick a fresh viral topic via AI strategy analysis
 *   2. Generate a scene-by-scene B2B script
 *   3. Animate the first scene with Veo (cinematic opener)
 *   4. Generate remaining scenes with Gemini Image
 *   5. Synthesize voiceover with Gemini TTS
 *   6. Compose full video with BGM + subtitles
 *   7. Save + auto-post to connected social channels
 */

import { Worker, Job } from 'bullmq';
import { redis } from '../db/redis.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { VideoComposerService } from '../services/video-composer.service.js';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import { VeoService } from '../services/veo.service.js';
import { CompanyKBService } from '../services/company-kb.service.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import stream from 'stream';
import { promisify } from 'util';

const pipeline = promisify(stream.pipeline);

async function downloadToTemp(url: string, fileName: string): Promise<string> {
  const tempPath = path.join(os.tmpdir(), fileName);
  let cleanUrl = url;
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    cleanUrl = url.replace(/^https?:\/\/[^/]+/, '');
  }
  if (cleanUrl.startsWith('/')) {
    const localFilePath = path.join(process.cwd(), 'frontend', 'public', cleanUrl);
    if (fs.existsSync(localFilePath)) {
      fs.copyFileSync(localFilePath, tempPath);
      return tempPath;
    }
  }
  const response = await fetch(cleanUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${cleanUrl}`);
  const fileStream = fs.createWriteStream(tempPath);
  // @ts-ignore
  await pipeline(response.body, fileStream);
  return tempPath;
}

function buildCompanyImagePrompt(scene: { visual: string }, sceneIndex: number, companyName: string): string {
  return `Create a high-quality vertical social media reel visual (9:16 portrait).

Scene description: ${scene.visual}

Context: B2B marketing visual for ${companyName}. Professional, modern, and highly cinematic.

Format requirements:
- Vertical 9:16 portrait frame
- No text, logos, watermarks, captions, or UI elements
- Full-bleed cinematic composition, safe margins for subtitle overlay
- Professional photography / corporate-cinematic aesthetic
- Sharp, high-contrast, modern color grading

Style: Hyper-realistic corporate photography, cinematic lighting, depth of field.

This is scene ${sceneIndex + 1} of the video — ensure visual variety and clear storytelling.`;
}

class CompanyReelWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'company-reel-generation',
      this.processJob.bind(this),
      {
        connection: redis,
        concurrency: 2,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info({ event: 'company_reel_completed', jobId: job.id, kbId: job.data.kbId });
    });

    this.worker.on('failed', (job, err) => {
      logger.error({ event: 'company_reel_failed', jobId: job?.id, kbId: job?.data.kbId, error: err.message });
    });
  }

  private async processJob(job: Job<{ kbId: string; companyReelId: string }>): Promise<any> {
    const { kbId, companyReelId } = job.data;
    const tempFilesToCleanup: string[] = [];

    const updateProgress = async (msg: string) => {
      logger.info({ event: 'company_reel_progress', companyReelId, message: msg });
      await prisma.companyReel.update({
        where: { id: companyReelId },
        data: { status: 'GENERATING', statusMessage: msg },
      });
    };

    try {
      await updateProgress('🚀 Initializing B2B Reel Engine...');

      const kb = await prisma.companyKnowledgeBase.findUniqueOrThrow({
        where: { id: kbId },
        include: { user: true }
      });

      // ── Step 1: Pick a viral topic ─────────────────────────────────────
      await updateProgress('🧠 AI Strategy Engine picking viral topic...');
      let topicResult;
      try {
        topicResult = await CompanyKBService.pickViralTopic(kbId);
      } catch (topicErr: any) {
        logger.warn({ event: 'company_reel_topic_failed', kbId, error: topicErr.message });
        // Fallback topic
        topicResult = {
          topic: `How ${kb.companyName} helps clients achieve results`,
          hook: `Most businesses don't know what's slowing them down. Here's what we found...`,
          contentPillar: 'Problem → Solution',
          targetPersona: kb.targetAudience,
          scriptHint: 'Start with pain → reveal solution → soft CTA'
        };
      }

      // Update the reel record with the chosen topic
      await prisma.companyReel.update({
        where: { id: companyReelId },
        data: { topic: topicResult.topic }
      });

      // ── Step 2: Generate scene-by-scene script ─────────────────────────
      await updateProgress('✍️ Writing cinematic B2B script...');
      let scenes;
      try {
        scenes = await CompanyKBService.generateCompanyScript(kbId, topicResult, kb.language);
      } catch (scriptErr: any) {
        throw new Error(`Script generation failed: ${scriptErr.message}`);
      }

      if (!scenes || scenes.length === 0) {
        throw new Error('Script generation produced no scenes.');
      }

      // Extract full voiceover text
      const scriptTts = scenes.map(s => s.voiceover).filter(Boolean).join(' ');
      const fullScript = scenes.map((s, i) => `Scene ${i + 1}:\n📹 ${s.visual}\n📝 ${s.on_screen_text}\n🎙️ ${s.voiceover}`).join('\n\n');

      await prisma.companyReel.update({
        where: { id: companyReelId },
        data: { script: fullScript }
      });

      // ── Step 3: Generate TTS Voiceover ─────────────────────────────────
      await updateProgress('🗣️ Synthesizing brand voiceover...');
      let ttsPath: string | null = null;
      let ttsDuration = 0;
      try {
        const ttsResult = await aiOrchestrator.generateVoiceover(
          scriptTts,
          kb.voiceId || 'Puck',
          kb.language,
          false,
          false,
          undefined,
          kb.tone === 'Professional' ? 'Speak with confidence and authority' :
          kb.tone === 'Bold' ? 'Speak boldly and energetically' :
          'Speak conversationally and naturally'
        );
        ttsPath = ttsResult.audioPath;
        tempFilesToCleanup.push(ttsPath);
        try {
          ttsDuration = await VideoComposerService.getMediaDuration(ttsPath);
        } catch {
          ttsDuration = Math.ceil(scriptTts.split(/\s+/).length / 2.3);
        }
      } catch (ttsErr: any) {
        logger.warn({ event: 'company_reel_tts_failed', companyReelId, error: ttsErr.message });
      }

      // ── Step 4: Generate Veo animated first scene ───────────────────────
      await updateProgress('🎬 Animating cinematic opening scene with Veo AI...');
      const firstScene = scenes[0];
      let veoClipPath: string | null = null;

      try {
        const veoPrompt = `${firstScene.visual}. Cinematic motion, natural camera movement, professional B2B marketing video aesthetic. 9:16 vertical format. 6 seconds.`;

        const operationName = await VeoService.initiateGeneration(veoPrompt);
        await updateProgress('⏳ Rendering Veo animated scene (this takes ~2 minutes)...');
        const veoLocalPath = await VeoService.pollUntilDone(operationName);

        if (veoLocalPath && fs.existsSync(veoLocalPath)) {
          veoClipPath = veoLocalPath;
          tempFilesToCleanup.push(veoClipPath);
          await updateProgress('✅ Veo cinematic scene ready!');
        }
      } catch (veoErr: any) {
        logger.warn({ event: 'company_reel_veo_failed', companyReelId, error: veoErr.message });
        await updateProgress('⚠️ Veo unavailable, using AI-generated visuals for all scenes...');
      }

      // ── Step 5: Generate AI images for remaining scenes ─────────────────
      await updateProgress('🖼️ Generating cinematic AI visuals for each scene...');
      const imagePaths: string[] = [];
      const remainingScenes = veoClipPath ? scenes.slice(1) : scenes;

      for (let i = 0; i < remainingScenes.length; i++) {
        const scene = remainingScenes[i];
        const sceneIdx = veoClipPath ? i + 1 : i;
        await updateProgress(`🖼️ Rendering visual ${sceneIdx + 1} of ${scenes.length}...`);

        try {
          const imagePrompt = buildCompanyImagePrompt(scene, sceneIdx, kb.companyName);
          const imagePath = await aiOrchestrator.generateImage(imagePrompt, Math.floor(Math.random() * 999999));
          imagePaths.push(imagePath);
          tempFilesToCleanup.push(imagePath);
        } catch (imgErr: any) {
          logger.warn({ event: 'company_reel_image_failed', companyReelId, scene: sceneIdx, error: imgErr.message });
        }
      }

      // ── Step 6: Assemble asset list ────────────────────────────────────
      const allAssetPaths: string[] = [];
      if (veoClipPath) allAssetPaths.push(veoClipPath);
      allAssetPaths.push(...imagePaths);

      if (allAssetPaths.length === 0) {
        throw new Error('No visual assets could be generated for this reel.');
      }

      // ── Step 7: Calculate clip durations ───────────────────────────────
      const secondsPerImage = ttsDuration > 0
        ? Math.max(3, (ttsDuration + 1) / (imagePaths.length + 0.5))
        : 4;

      const clipDurations: number[] = [];
      for (const assetPath of allAssetPaths) {
        const isVideo = /\.(mp4|webm|mov)$/i.test(assetPath);
        if (isVideo) {
          try {
            const dur = await VideoComposerService.getMediaDuration(assetPath);
            clipDurations.push(dur);
          } catch {
            clipDurations.push(6);
          }
        } else {
          clipDurations.push(secondsPerImage);
        }
      }

      // ── Step 8: Compose video clips ────────────────────────────────────
      await updateProgress('🎬 Assembling cinematic reel...');
      const abortController = new AbortController();
      const { clipPaths, tempFiles: composerTempFiles } = await VideoComposerService.createVideoClips(
        allAssetPaths,
        clipDurations,
        'vertical',
        abortController.signal
      );
      if (clipPaths) tempFilesToCleanup.push(...clipPaths);
      if (composerTempFiles) tempFilesToCleanup.push(...composerTempFiles);

      const { outputPath: concatVideoPath, tempFiles: concatTempFiles } = await VideoComposerService.concatVideos(
        clipPaths,
        abortController.signal,
        clipDurations
      );
      if (concatVideoPath) tempFilesToCleanup.push(concatVideoPath);
      if (concatTempFiles) tempFilesToCleanup.push(...concatTempFiles);

      // ── Step 9: Generate background music ──────────────────────────────
      await updateProgress('🎵 Composing background music...');
      let bgmPath: string | null = null;
      try {
        const musicVibePrompt = `${kb.tone === 'Bold' ? 'Energetic, bold, modern corporate' : 'Professional, confident, motivating corporate'} background music for a B2B marketing reel`;
        bgmPath = await aiOrchestrator.generateMusic(musicVibePrompt, []);
        if (bgmPath) tempFilesToCleanup.push(bgmPath);
      } catch (musicErr: any) {
        logger.warn({ event: 'company_reel_music_failed', companyReelId, error: musicErr.message });
      }

      const totalDuration = clipDurations.reduce((a, b) => a + b, 0);

      // ── Step 10: Mix audio ──────────────────────────────────────────────
      await updateProgress('🔊 Mixing voiceover and background music...');
      let mixedAudioPath: string | null = ttsPath;

      if (ttsPath && bgmPath) {
        try {
          const { outputPath: mixed, tempFiles: bgmTempFiles } = await VideoComposerService.addBackgroundMusic(
            ttsPath,
            bgmPath,
            totalDuration,
            abortController.signal
          );
          mixedAudioPath = mixed;
          if (mixedAudioPath) tempFilesToCleanup.push(mixedAudioPath);
          if (bgmTempFiles) tempFilesToCleanup.push(...bgmTempFiles);
        } catch (mixErr: any) {
          logger.warn({ event: 'company_reel_mix_failed', companyReelId, error: mixErr.message });
        }
      }

      // ── Step 11: Generate subtitles ─────────────────────────────────────
      await updateProgress('💬 Burning subtitles...');
      let subtitlePath: string | null = null;
      try {
        subtitlePath = await VideoComposerService.generateSubtitlesFile(scriptTts, totalDuration, []);
        if (subtitlePath) tempFilesToCleanup.push(subtitlePath);
      } catch (subErr: any) {
        logger.warn({ event: 'company_reel_subtitles_failed', companyReelId, error: subErr.message });
      }

      // ── Step 12: Merge all ──────────────────────────────────────────────
      await updateProgress('🎞️ Finalizing video...');
      const { outputPath: finalVideoPath, tempFiles: mergeTempFiles } = await VideoComposerService.mergeAudioVideo(
        concatVideoPath,
        mixedAudioPath ?? undefined,
        subtitlePath ?? undefined,
        abortController.signal
      );
      if (finalVideoPath) tempFilesToCleanup.push(finalVideoPath);
      if (mergeTempFiles) tempFilesToCleanup.push(...mergeTempFiles);

      // ── Step 13: Save to public uploads ────────────────────────────────
      const publicFilename = `company_reel_${companyReelId}_${Date.now()}.mp4`;
      const publicDir = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'reels');
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

      const publicFilePath = path.join(publicDir, publicFilename);
      fs.copyFileSync(finalVideoPath, publicFilePath);

      const videoUrl = `/uploads/reels/${publicFilename}`;

      // Generate thumbnail
      let thumbnailUrl: string | null = null;
      try {
        const thumbnailPath = await VideoComposerService.generateThumbnail(publicFilePath);
        const thumbnailFilename = `thumb_${publicFilename}`;
        const thumbnailDest = path.join(publicDir, thumbnailFilename);
        fs.copyFileSync(thumbnailPath, thumbnailDest);
        thumbnailUrl = `/uploads/reels/${thumbnailFilename}`;
      } catch (thumbErr: any) {
        logger.warn({ event: 'company_reel_thumb_failed', companyReelId, error: thumbErr.message });
      }

      // ── Step 14: Update reel record ────────────────────────────────────
      const updatedReel = await prisma.companyReel.update({
        where: { id: companyReelId },
        data: {
          status: 'READY',
          videoUrl,
          thumbnail: thumbnailUrl,
          statusMessage: 'Ready to publish',
          metadata: {
            topic: topicResult.topic,
            hook: topicResult.hook,
            contentPillar: topicResult.contentPillar,
            targetPersona: topicResult.targetPersona,
            hasVeoScene: !!veoClipPath,
            sceneCount: scenes.length,
            language: kb.language,
            voiceId: kb.voiceId,
            generatedAt: Date.now()
          }
        }
      });

      // ── Step 15: Auto-post to social channels ───────────────────────────
      const channels: string[] = JSON.parse(updatedReel.socialChannels || '[]');
      if (channels.length > 0) {
        try {
          await updateProgress('📤 Publishing to social channels...');
          const { postingEngine } = await import('../services/posting-engine.service.js');
          const videoBuffer = fs.readFileSync(publicFilePath);

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
              where: { id: { in: accountIds }, userId: kb.userId },
              select: { platform: true }
            });
            for (const acc of dbAccounts) resolvedPlatforms.add(acc.platform.toString().toUpperCase());
          }

          const mappedPlatforms = Array.from(resolvedPlatforms);

          if (mappedPlatforms.length > 0) {
            const platformOptions: Record<string, any> = {};
            for (const plat of mappedPlatforms) {
              if (plat === 'INSTAGRAM' || plat === 'FACEBOOK') {
                platformOptions[plat] = { postType: 'REEL', autoFix: true };
              } else if (plat === 'YOUTUBE') {
                platformOptions[plat] = { postType: 'SHORTS', autoFix: true };
              } else {
                platformOptions[plat] = { autoFix: true };
              }
            }

            const scheduleResult = await postingEngine.schedulePost(kb.userId, {
              content: `${topicResult.topic}\n\n${topicResult.hook}`,
              media: [{ file: videoBuffer, type: 'video', originalName: publicFilename }],
              platforms: mappedPlatforms,
              timezone: 'UTC',
              platformOptions
            });

            await prisma.companyReel.update({
              where: { id: companyReelId },
              data: {
                status: 'PUBLISHING',
                postId: scheduleResult.postId,
                statusMessage: 'Publishing to channels...'
              }
            });

            logger.info({ event: 'company_reel_posted', companyReelId, postId: scheduleResult.postId });
          }
        } catch (postErr: any) {
          logger.error({ event: 'company_reel_post_failed', companyReelId, error: postErr.message });
          await prisma.companyReel.update({
            where: { id: companyReelId },
            data: { status: 'READY', statusMessage: 'Video ready, auto-post failed.' }
          });
        }
      }

      logger.info({ event: 'company_reel_generation_success', companyReelId, videoUrl });
      return { success: true, videoUrl };

    } catch (error: any) {
      logger.error({ event: 'company_reel_generation_error', companyReelId, error: error.message });
      await prisma.companyReel.update({
        where: { id: companyReelId },
        data: {
          status: 'FAILED',
          statusMessage: error.message.substring(0, 150)
        }
      });
      return { success: false, error: error.message };
    } finally {
      const uniqueFiles = Array.from(new Set(tempFilesToCleanup));
      for (const filePath of uniqueFiles) {
        try {
          if (filePath && fs.existsSync(filePath) && !filePath.includes('/frontend/public/uploads/reels/')) {
            fs.unlinkSync(filePath);
          }
        } catch (cleanupErr: any) {
          logger.debug({ event: 'company_reel_cleanup_failed', filePath, error: cleanupErr.message });
        }
      }
    }
  }

  public async start() {
    logger.info({ event: 'company_reel_worker_started' });
    await this.worker.waitUntilReady();
  }

  public async shutdown() {
    await this.worker.close();
    logger.info({ event: 'company_reel_worker_shutdown' });
  }
}

export const companyReelWorker = new CompanyReelWorker();
