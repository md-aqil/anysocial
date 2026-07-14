import { Worker, Job } from 'bullmq';
import { redis } from '../db/redis.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import { VideoComposerService } from '../services/video-composer.service.js';
import path from 'path';
import fs from 'fs';

import { VeoService } from '../services/veo.service.js';
import os from 'os';

type SubtitleStyle = 'orange-box' | 'blue-box' | 'outline' | 'minimal';

/** Formats seconds into ASS time format H:MM:SS.cs */
function formatAssTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const centiseconds = Math.floor((totalSeconds % 1) * 100);
  const pad = (n: number, size = 2) => ('00' + n).slice(-size);
  return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds)}`;
}

/** Escapes text for safe inclusion in an ASS dialogue line. */
function escapeAssText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
    .replace(/\r?\n/g, '\\N')
    .trim();
}

/**
 * Builds an animated ASS subtitle file for the given caption lines and style.
 * Using a subtitle file + the `subtitles` filter is far more robust than chained
 * `drawtext` filters (no filtergraph comma/quote parsing pitfalls), and gives
 * consistent, brand-styled captions.
 */
function buildAssSubtitleFile(
  sentences: string[],
  totalDuration: number,
  style: SubtitleStyle
): string | null {
  const lines = sentences.map((s) => escapeAssText(s)).filter(Boolean);
  if (lines.length === 0) return null;

  // ASS colours are &HAABBGGRR (alpha, blue, green, red); alpha 00 = opaque.
  const WHITE = '&H00FFFFFF';
  const BLACK = '&H00000000';
  const ORANGE = '&H00006BFF'; // #FF6B00
  const BLUE = '&H00FF5500';   // #0055FF

  // Style tuning per option. BorderStyle 3 = opaque box (box colour = OutlineColour).
  let fontSize = 60;
  let borderStyle = 1;
  let outline = 3;
  let shadow = 0;
  let outlineColour = BLACK;
  let backColour = '&H00000000';

  if (style === 'orange-box') {
    borderStyle = 3; outline = 8; shadow = 0; outlineColour = ORANGE; backColour = ORANGE;
  } else if (style === 'blue-box') {
    borderStyle = 3; outline = 8; shadow = 0; outlineColour = BLUE; backColour = BLUE;
  } else if (style === 'outline') {
    borderStyle = 1; outline = 4; shadow = 0; outlineColour = BLACK;
  } else { // minimal — subtle drop shadow
    borderStyle = 1; outline = 1; shadow = 2; outlineColour = BLACK; backColour = '&H80000000';
  }

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Poppins,${fontSize},${WHITE},${WHITE},${outlineColour},${backColour},-1,0,0,0,100,100,0,0,${borderStyle},${outline},${shadow},5,60,60,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const perLine = totalDuration / lines.length;
  let body = '';
  for (let i = 0; i < lines.length; i++) {
    const start = formatAssTime(i * perLine);
    const end = formatAssTime((i + 1) * perLine);
    // Gentle pop-in scale animation for a premium feel.
    const anim = `{\\fscx90\\fscy90\\t(0,150,\\fscx100\\fscy100)}`;
    body += `Dialogue: 0,${start},${end},Default,,0,0,0,,${anim}${lines[i]}\n`;
  }

  const assPath = path.join(os.tmpdir(), `veo_subs_${Date.now()}.ass`);
  fs.writeFileSync(assPath, header + body);
  return assPath;
}

class VeoGenerationWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker('veo-generation', async (job: Job) => {
  const { reelId, topic, subtitleStyle } = job.data;
  logger.info({ event: 'veo_generation_started', reelId, topic });

  const tempFilesToCleanup: string[] = [];

  try {
    const reelDoc = await prisma.reel.findUnique({ where: { id: reelId } });
    const currentMetadata: any = reelDoc?.metadata || {};

    const updateProgress = async (msg: string, metadataUpdates: any = {}) => {
      Object.assign(currentMetadata, metadataUpdates);
      await prisma.reel.update({
        where: { id: reelId },
        data: { 
          status: 'GENERATING', 
          statusMessage: msg,
          metadata: currentMetadata
        },
      });
    };

    await updateProgress('📝 Generating AI script & prompt...');

    // 1. Generate script + Veo visual prompt (faceless cinematic creator format).
    const scriptPrompt = `You are a viral TikTok and Instagram Reels creator specialist. Write a calm, luxury minimalist faceless script about: ${topic}.
The video follows the quiet luxury, Scandi minimalist lifestyle aesthetic.
We need a curiosity-inducing contradiction hook at the beginning, followed by 3-5 short, sequential, high-impact lines.
For example:
"I made $2M without showing my face."
"I quit my job at 21."
"I never went to college."
"I have zero employees."
"Here's exactly how I did it."

Keep the sentences/lines very short (maximum 5-8 words per line/sentence so it fits perfectly on a mobile portrait screen without wrapping).
Also, provide a highly detailed 1-sentence visual prompt optimized for Google Veo 3 that represents a premium faceless lifestyle scene.
It MUST follow this exact style:
"Locked tripod shot of [environment]. A [subject/entrepreneur] quietly [doing something subtle], reaching for [something], and [something]. Soft natural daylight fills the room, creating a calm editorial atmosphere. Muted colors, premium Scandinavian interior, cinematic shallow depth of field, subtle movement only, no camera movement, realistic motion, quiet luxury aesthetic."

Ensure the visual prompt matches the tone/subject of the topic.
Format your output as a JSON object:
{
  "script": "Sentence 1. Sentence 2. Sentence 3. Sentence 4. Sentence 5.",
  "visual_prompt": "The detailed visual prompt following the Scandinavian locked-tripod format."
}`;

    const aiResponse = await aiOrchestrator.generateContent(scriptPrompt);
    const parsed = typeof aiResponse === 'string' ? JSON.parse(aiResponse.replace(/```json/g, '').replace(/```/g, '')) : aiResponse;
    const { script, visual_prompt } = parsed;

    await updateProgress('🎨 Generating initial image (Global AI)...', {
      generatedScript: script,
      generatedVisualPrompt: visual_prompt
    });

    // 2. Generate a single anchor image for Veo image-to-video.
    const imagePath = await aiOrchestrator.generateImage(visual_prompt, 0);
    let publicThumbnailUrl = '';
    let generatedImageBase64 = null;
    if (imagePath && fs.existsSync(imagePath)) {
      const thumbFilename = `veo_thumb_${Date.now()}.png`;
      const thumbDest = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'reels', thumbFilename);
      if (!fs.existsSync(path.dirname(thumbDest))) fs.mkdirSync(path.dirname(thumbDest), { recursive: true });
      fs.copyFileSync(imagePath, thumbDest);
      publicThumbnailUrl = `/uploads/reels/${thumbFilename}`;
      generatedImageBase64 = fs.readFileSync(imagePath).toString('base64');
    }

    await updateProgress('🎬 Submitting to Google Veo 3 (Long Running)...', {
      generatedImage: publicThumbnailUrl
    });

    // 3. Google Veo 3 Video Generation (delegated to VeoService for bounded polling + retries)
    const targetDuration = 8;
    const operationName = await VeoService.initiateGeneration(
      visual_prompt,
      generatedImageBase64 || undefined,
      generatedImageBase64 ? 'image/jpeg' : undefined,
      { durationSeconds: targetDuration }
    );

    await updateProgress('⏳ Veo 3 is rendering video (this takes a few minutes)...');

    // pollUntilDone polls with a 10-minute cap and downloads the clip to a temp file.
    const veoTempPath = await VeoService.pollUntilDone(operationName);
    tempFilesToCleanup.push(veoTempPath);

    await updateProgress('📥 Preparing rendered video...');

    const uploadsDir = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'reels');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const rawVideoFilename = `veo_raw_${Date.now()}.mp4`;
    const localRawVideo = path.join(uploadsDir, rawVideoFilename);
    fs.copyFileSync(veoTempPath, localRawVideo);
    const publicRawVideoUrl = `/uploads/reels/${rawVideoFilename}`;

    // Determine the true rendered duration so caption timing matches the actual video.
    let actualDuration = targetDuration;
    try {
      actualDuration = await VideoComposerService.getMediaDuration(localRawVideo);
    } catch (durErr: any) {
      logger.warn({ event: 'veo_duration_probe_failed', reelId, error: durErr.message });
    }

    await updateProgress('🔤 Applying final text composition & styles...', {
      rawVideoUrl: publicRawVideoUrl
    });

    // 4. Final composition: burn captions as a styled ASS subtitle track.
    const finalVideoFilename = `veo_final_${Date.now()}.mp4`;
    const finalVideoPath = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'reels', finalVideoFilename);

    const ffmpeg = (await import('fluent-ffmpeg')).default;

    // Split the script into short caption lines and time them across the real duration.
    const sentences = script.split(/[.!?\n]+/).map((s: string) => s.trim()).filter(Boolean);
    const assPath = buildAssSubtitleFile(sentences, actualDuration, (subtitleStyle || 'minimal') as SubtitleStyle);
    if (assPath) tempFilesToCleanup.push(assPath);

    await new Promise((resolve, reject) => {
      const proc = ffmpeg(localRawVideo);

      if (assPath) {
        // The subtitles filter is a single filter — no chained-filtergraph comma pitfalls.
        const escapedPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        proc.videoFilters(`subtitles='${escapedPath}'`)
            .outputOptions(['-c:v libx264', '-preset fast', '-crf 23', '-c:a copy']);
      } else {
        // No captions — just remux without re-encoding.
        proc.outputOptions(['-c copy']);
      }

      proc.save(finalVideoPath)
        .on('end', resolve)
        .on('error', reject);
    });

    const publicVideoUrl = `/uploads/reels/${finalVideoFilename}`;

    await prisma.reel.update({
      where: { id: reelId },
      data: {
        status: 'READY',
        statusMessage: 'Veo Short generation complete!',
        videoUrl: publicVideoUrl,
        thumbnail: publicThumbnailUrl,
        metadata: currentMetadata
      },
    });

    logger.info({ event: 'veo_generation_success', reelId });
  } catch (error: any) {
    logger.error({ event: 'veo_generation_failed', reelId, error: error.message });
    await prisma.reel.update({
      where: { id: reelId },
      data: { status: 'FAILED', statusMessage: `Failed: ${error.message}` },
    });
  } finally {
    // Clean up transient temp files (never touch published assets in public/uploads).
    const uniqueFiles = Array.from(new Set(tempFilesToCleanup));
    for (const filePath of uniqueFiles) {
      try {
        if (filePath && fs.existsSync(filePath) && !filePath.includes('/frontend/public/uploads/')) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupErr: any) {
        logger.debug({ event: 'veo_cleanup_failed', filePath, error: cleanupErr.message });
      }
    }
  }
    }, { connection: redis });

    this.worker.on('error', err => {
      logger.error({ event: 'veo_worker_error', error: err.message });
    });
  }

  public async start() {
    logger.info({ event: 'veo_worker_started' });
    await this.worker.waitUntilReady();
  }

  public async shutdown() {
    await this.worker.close();
    logger.info({ event: 'veo_worker_shutdown' });
  }
}

export const veoWorker = new VeoGenerationWorker();
