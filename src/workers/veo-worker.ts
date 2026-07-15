import { Worker, Job } from 'bullmq';
import { redis } from '../db/redis.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import { VideoComposerService } from '../services/video-composer.service.js';
import path from 'path';
import fs from 'fs';
import * as sharpModule from 'sharp';
const sharp = (sharpModule as any).default || sharpModule;

import { VeoService } from '../services/veo.service.js';
import os from 'os';

type SubtitleStyle = 'cinematic-shadow' | 'solid-dark-box' | 'transparent-dark-box' | 'classic-outline';

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

  let fontSize = 35; // Reduced from 40
  let borderStyle = 1;
  let outline = 1.5;
  let shadow = 1; // Further reduced shadow distance
  let outlineColour = '&H00000000';
  let backColour = '&HB3000000'; 
  let extraTags = '\\blur12';

  if (style === 'solid-dark-box') {
    borderStyle = 3; outline = 8; shadow = 0; outlineColour = '&H00000000'; backColour = '&H00000000'; extraTags = '';
  } else if (style === 'transparent-dark-box') {
    borderStyle = 3; outline = 8; shadow = 0; outlineColour = '&H66000000'; backColour = '&H66000000'; extraTags = '';
  } else if (style === 'classic-outline') {
    borderStyle = 1; outline = 3.5; shadow = 0; outlineColour = '&H00000000'; extraTags = '';
  }

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Helvetica,${fontSize},${WHITE},${WHITE},${outlineColour},${backColour},700,0,0,0,100,100,-1,0,${borderStyle},${outline},${shadow},5,100,100,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // 1. Group sentences individually so they appear one by one sequentially
  const paragraphs: string[][] = sentences.map(s => {
    const cleanSentence = escapeAssText(s);
    return cleanSentence ? [cleanSentence] : [];
  }).filter(p => p.length > 0);

  // 2. Format paragraphs with intelligent text wrapping
  const formattedParagraphs = paragraphs.map(p => {
    return p.map(s => {
       const words = s.split(/\\s+/);
       // Balance long sentences by splitting in half
       if (words.length > 6) {
          const mid = Math.floor(words.length / 2);
          return words.slice(0, mid).join(' ') + '\\N' + words.slice(mid).join(' ');
       }
       return s;
    }).join('\\N\\N\\N'); 
  });

  // 3. Calculate timing based on reading speed and proportional duration
  const paragraphWordCounts = formattedParagraphs.map(text => text.replace(/\\\\N/g, ' ').split(/\\s+/).length);
  const totalWords = paragraphWordCounts.reduce((a, b) => a + b, 0);
  
  let currentTimeMs = 0;
  let eventTextBlocks = [];
  
  for (let i = 0; i < formattedParagraphs.length; i++) {
    const text = formattedParagraphs[i];
    let pDurationMs = (paragraphWordCounts[i] / totalWords) * totalDuration * 1000;
    
    // Inject alpha start (invisible), then animate to visible
    const fadeStart = Math.round(currentTimeMs);
    const fadeEnd = fadeStart + 180;
    const block = `{\\alpha&HFF&\\t(${fadeStart},${fadeEnd},\\alpha&H00&)}${text}`;
    eventTextBlocks.push(block);
    
    currentTimeMs += pDurationMs;
  }
  
  const finalEventText = `{${extraTags}\\pos(360,665)}` + eventTextBlocks.join('\\N\\N\\N\\N\\N');
  
  const start = formatAssTime(0);
  const end = formatAssTime(totalDuration); // Displays until the very end
  
  let body = `Dialogue: 0,${start},${end},Default,,0,0,0,,${finalEventText}\\n`;

  const assPath = path.join(os.tmpdir(), `veo_subs_${Date.now()}.ass`);
  fs.writeFileSync(assPath, header + body);
  return assPath;
}

class VeoGenerationWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker('veo-generation', async (job: Job) => {
  const { reelId, topic, subtitleStyle, visualStyle } = job.data;
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
    let aestheticInstruction = "Vibrant natural colors, premium Scandinavian interior, cinematic shallow depth of field, subtle movement only, no camera movement, realistic motion, quiet luxury aesthetic.";
    if (visualStyle === 'moody') aestheticInstruction = "Dark wood textures, subtle warm neon ambient lighting, deep cinematic shadows, shallow depth of field, moody atmosphere, ultra-detailed masterpiece, sharp focus.";
    if (visualStyle === 'hygge') aestheticInstruction = "Soft morning sunlight filtering through sheer linen curtains, casting beautiful shadows. White marble textures, serene, peaceful, light and airy aesthetic, shallow depth of field.";
    if (visualStyle === 'luxury') aestheticInstruction = "Overcast, diffused natural light, quiet luxury, high-end travel aesthetic, cinematic realism, premium hotel vibe.";
    if (visualStyle === 'vintage') aestheticInstruction = "Rich golden hour lighting pouring into the room, cinematic film grain, retro aesthetic, nostalgic and incredibly calm atmosphere, warm glowing tones.";
    if (visualStyle === 'tech') aestheticInstruction = "Sleek modern glass textures, matte black accessories, cool blue-toned natural light mixed with subtle LED rim lighting, ultra-crisp, futuristic yet grounded luxury aesthetic.";

    const scriptPrompt = `You are a viral TikTok and Instagram Reels creator specialist. Write a calm, luxury minimalist faceless script about: ${topic}.
The video follows the quiet luxury, Scandi minimalist lifestyle aesthetic.
We need exactly 3 short paragraphs. 
Paragraph 1: A curiosity-inducing contradiction hook.
Paragraph 2: The middle section/context.
Paragraph 3: A short CTA (Call To Action).

Format requirements:
- VERY IMPORTANT: The script MUST be extremely short and punchy. Maximum 3 short sentences TOTAL for the entire video. Do not write a long script.
- Separate each paragraph with a blank line (double newline).
- Each paragraph should have 1-2 short lines formatted with line breaks.
- Keep the sentences/lines very short (maximum 4-6 words per line) so it fits perfectly on a mobile portrait screen without wrapping.

For example:
"I'm Victoria.
I'm 30 & I'm unemployed but
last month I cleared $11,371.

I'm not an influencer,
I don't do UGC,
and I don't sell Etsy stuff.
Actually, I don't even show
my face.

Here is exactly what I did 👇"
Also, provide a highly detailed 1-sentence visual prompt optimized for Google Veo 3 that represents a premium faceless lifestyle scene.
It MUST follow this exact style:
"Locked tripod shot of [environment]. A [subject/entrepreneur] quietly [doing something subtle], reaching for [something], and [something]. ${aestheticInstruction}"

CRITICAL INSTRUCTION: You MUST violently randomize the [environment], [subject/entrepreneur], and lighting for EVERY generation! DO NOT use the same generic room. Use different locations (e.g., modern glass office, cozy hygge living room, minimalist cafe, moody dusk studio), different subtle actions (e.g., pouring matcha, organizing aesthetic notebooks, adjusting a lamp), and unique clothing styles. 
Ensure the visual prompt matches the tone/subject of the topic, but keep it strictly to the scene description (I will append the technical camera parameters).

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
    const imageParameters = "9:16 vertical aspect ratio. Shot on 85mm lens, f/1.8, ISO 200. Do not beautify. No plastic skin, no CGI smoothing. Lighting creates sharp realistic highlights. Raw, unretouched, hyper-realistic candid photography.";
    const fullImagePrompt = `${visual_prompt}. ${imageParameters}`;

    const imagePath = await aiOrchestrator.generateImage(fullImagePrompt, 0);
    let publicThumbnailUrl = '';
    let generatedImageBase64 = null;
    if (imagePath && fs.existsSync(imagePath)) {
      // Crop the generated image to exactly 9:16 (720x1280) so Veo generates a native 9:16 video
      const croppedImagePath = path.join(os.tmpdir(), `veo_thumb_cropped_${Date.now()}.png`);
      await sharp(imagePath)
        .resize({ width: 720, height: 1280, fit: 'cover', position: 'center' })
        .png()
        .toFile(croppedImagePath);

      const thumbFilename = `veo_thumb_${Date.now()}.png`;
      const thumbDest = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'reels', thumbFilename);
      if (!fs.existsSync(path.dirname(thumbDest))) fs.mkdirSync(path.dirname(thumbDest), { recursive: true });
      fs.copyFileSync(croppedImagePath, thumbDest);
      publicThumbnailUrl = `/uploads/reels/${thumbFilename}`;
      generatedImageBase64 = fs.readFileSync(croppedImagePath).toString('base64');
      
      tempFilesToCleanup.push(croppedImagePath);
    }

    // 3. Google Veo 3 Video Generation
    const motionParameters = "Movement adheres strictly to physical weight and gravity at real-time natural human speed. Strictly locked tripod camera with zero drift and stable optical depth of field. Absolutely no structural morphing, zero background warping, and no hallucinatory merging. True temporal consistency.";
    const fullVideoPrompt = `${visual_prompt}. ${imageParameters} ${motionParameters}`;
    
    await updateProgress('🎬 Submitting to Google Veo 3 (Long Running)...', {
      generatedImage: publicThumbnailUrl,
      fullImagePrompt: fullImagePrompt,
      fullVideoPrompt: fullVideoPrompt
    });
    
    const targetDuration = 8;
    const operationName = await VeoService.initiateGeneration(
      fullVideoPrompt,
      generatedImageBase64 || undefined,
      generatedImageBase64 ? 'image/png' : undefined,
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
    // We multiply by 2 because we will loop the video once in the next step.
    let actualDuration = targetDuration * 2;
    try {
      actualDuration = (await VideoComposerService.getMediaDuration(localRawVideo)) * 2;
    } catch (durErr: any) {
      logger.warn({ event: 'veo_duration_probe_failed', reelId, error: durErr.message });
    }

    const musicVibePrompt = `Ultra high quality, masterpiece audio, cinematic lo-fi ambient background music, calm luxury scandi minimalist lifestyle vibe, highly detailed`;
    await updateProgress('🎵 Generating background music & final composition...', {
      rawVideoUrl: publicRawVideoUrl,
      musicPrompt: musicVibePrompt
    });
    let bgmPath: string | null = null;
    try {
      bgmPath = await aiOrchestrator.generateMusic(musicVibePrompt, []);
      if (bgmPath) tempFilesToCleanup.push(bgmPath);
    } catch (musicErr: any) {
      logger.warn({ event: 'veo_music_failed', reelId, error: musicErr.message });
    }

    // 4. Pre-process raw video: crop to 9:16 and add a 40% black overlay for text readability
    const processedVideoFilename = `veo_processed_${Date.now()}.mp4`;
    const processedVideoPath = path.join(os.tmpdir(), processedVideoFilename);
    const ffmpegModule = await import('fluent-ffmpeg');
    const ffmpeg = (ffmpegModule as any).default || ffmpegModule;
    
    await new Promise((resolve, reject) => {
      ffmpeg(localRawVideo)
        .inputOptions(['-stream_loop', '1'])
        .videoFilters([
          'drawbox=x=0:y=0:w=iw:h=ih:color=black@0.15:t=fill'
        ])
        .outputOptions(['-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy'])
        .save(processedVideoPath)
        .on('end', resolve)
        .on('error', reject);
    });
    tempFilesToCleanup.push(processedVideoPath);

    // 5. Final composition: burn captions as a styled ASS subtitle track and add music.
    const finalVideoFilename = `veo_final_${Date.now()}.mp4`;
    const finalVideoPath = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'reels', finalVideoFilename);

    // Split the script into exact sentences, then chunk into 3 groups.
    const rawSentences = script.replace(/\\n/g, ' ').split(/(?<=[.!?])\s+/).map((s: string) => s.trim()).filter(Boolean);
    const paragraphs: string[] = [];
    const sentencesPerGroup = Math.ceil(rawSentences.length / 3);
    for (let i = 0; i < rawSentences.length; i += sentencesPerGroup) {
      paragraphs.push(rawSentences.slice(i, i + sentencesPerGroup).join('\n'));
    }
    
    const assPath = buildAssSubtitleFile(paragraphs, actualDuration, (subtitleStyle || 'cinematic-shadow') as SubtitleStyle);
    if (assPath) tempFilesToCleanup.push(assPath);

    const { outputPath: mergedVideoPath, tempFiles: mergeTempFiles } = await VideoComposerService.mergeAudioVideo(
      processedVideoPath,
      bgmPath,
      assPath ?? undefined,
      undefined,
      undefined,
      actualDuration
    );
    if (mergeTempFiles) tempFilesToCleanup.push(...mergeTempFiles);
    
    fs.copyFileSync(mergedVideoPath, finalVideoPath);
    tempFilesToCleanup.push(mergedVideoPath);

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

    const finalReel = await prisma.reel.findUnique({ where: { id: reelId } });
    if (finalReel && finalReel.socialChannels) {
      const channels: string[] = JSON.parse(finalReel.socialChannels || '[]');
      if (channels.length > 0) {
        try {
          const { postingEngine } = await import('../services/posting-engine.service.js');
          const videoBuffer = fs.readFileSync(finalVideoPath);
          
          const scheduledTime = finalReel.scheduledFor ? new Date(finalReel.scheduledFor) : null;
          const minDelayMs = 60 * 1000 + 5000;
          const isSafeFuture = scheduledTime && (scheduledTime.getTime() - Date.now() >= minDelayMs);

          const resolvedPlatforms = new Set<string>();
          const accountIds: string[] = [];
          
          for (const channel of channels) {
            const trimmed = channel.trim();
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
              accountIds.push(trimmed);
            } else {
              resolvedPlatforms.add(trimmed.toUpperCase());
            }
          }
          
          if (accountIds.length > 0) {
            const dbAccounts = await prisma.socialAccount.findMany({
              where: { id: { in: accountIds }, userId: finalReel.userId },
              select: { platform: true }
            });
            for (const acc of dbAccounts) {
              resolvedPlatforms.add(acc.platform.toString().toUpperCase());
            }
          }
          const mappedPlatforms = Array.from(resolvedPlatforms);
          
          if (mappedPlatforms.length > 0) {
            logger.info({ event: 'veo_auto_posting', reelId, platforms: mappedPlatforms });
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
            
            const scheduleResult = await postingEngine.schedulePost(finalReel.userId, {
              content: (finalReel.script || '').substring(0, 2000),
              media: [{ file: videoBuffer, type: 'video', originalName: finalVideoFilename }],
              platforms: mappedPlatforms,
              timezone: 'UTC',
              scheduledAt: isSafeFuture && scheduledTime ? scheduledTime.toISOString() : undefined,
              platformOptions
            });

            await prisma.reel.update({
              where: { id: reelId },
              data: {
                status: isSafeFuture ? 'SCHEDULED' : 'PUBLISHING',
                postId: scheduleResult.postId,
                statusMessage: isSafeFuture 
                  ? `Scheduled for ${scheduledTime.toLocaleString()}` 
                  : 'Publishing to social media...'
              }
            });
          }
        } catch (postErr: any) {
          logger.error({ event: 'veo_auto_post_failed', reelId, error: postErr.message });
        }
      }
    }

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
