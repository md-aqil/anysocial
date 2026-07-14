import { Worker, Job } from 'bullmq';
import { redis } from '../db/redis.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import { VideoComposerService } from '../services/video-composer.service.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Helper to poll Veo 3 operation
async function pollVeoOperation(operationName: string, token: string): Promise<any> {
  // Extract project and location to build fetchPredictOperation endpoint
  let url = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`;
  const match = operationName.match(/^projects\/([^\/]+)\/locations\/([^\/]+)\/(?:publishers\/google\/models\/([^\/]+)\/)?operations\/([^\/]+)$/);
  if (match) {
    const [, projectId, location, modelIdFromPath, operationId] = match;
    const modelId = modelIdFromPath || process.env.VEO_MODEL || 'veo-3.0-fast-generate-001';
    url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:fetchPredictOperation`;
  }

  while (true) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ operationName })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Veo polling failed: ${res.status} ${res.statusText} - ${errText}`);
    }
    const data = await res.json() as any;
    if (data.done) {
      if (data.error) throw new Error(`Veo generation error: ${data.error.message}`);
      return data.response;
    }
    // Wait 10 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

function escapeFfmpegText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "'\\\\''")
    .replace(/:/g, '\\\\:')
    .replace(/%/g, '\\\\%');
}

class VeoGenerationWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker('veo-generation', async (job: Job) => {
  const { reelId, topic, subtitleStyle, format = 'creator', productImageBase64, productImageMimeType } = job.data;
  logger.info({ event: 'veo_generation_started', reelId, topic, format, hasImage: !!productImageBase64 });

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
    
    // 1. Generate text (script and video description)
    let scriptPrompt = `Write a short, viral script about: ${topic}. Also provide a highly detailed 1-sentence visual description of what the video should show. Format as JSON: { "script": "...", "visual_prompt": "..." }`;
    
    if (format === 'creator') {
      scriptPrompt = `You are a viral TikTok and Instagram Reels creator specialist. Write a calm, luxury minimalist faceless script about: ${topic}.
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
    } else if (productImageBase64) {
      scriptPrompt = `Write a short, viral script about: ${topic}. Also provide a concise, high-level visual description (30-50 words) optimized for Veo image-to-video generation. 
CRITICAL PROMPTING RULES:
1. Do NOT describe the detailed visual features, patterns, materials, or colors of the product itself (since the model extracts them directly from the reference image).
2. Refer to the product simply as "the product from the reference image" or "the item in the reference image".
3. Focus the prompt entirely on motion, environment, lighting, and cinematic camera movement.
4. End the visual prompt exactly with: ", professional fashion film aesthetic, cinematic lighting, smooth slow-motion, no text, no watermark"
Format as JSON: { "script": "...", "visual_prompt": "..." }`;
    }
    const aiResponse = await aiOrchestrator.generateContent(scriptPrompt);
    const parsed = typeof aiResponse === 'string' ? JSON.parse(aiResponse.replace(/```json/g, '').replace(/```/g, '')) : aiResponse;
    const { script, visual_prompt } = parsed;

    await updateProgress('🎨 Generating initial image (Global AI)...', {
      generatedScript: script,
      generatedVisualPrompt: visual_prompt
    });
    
    // 2. Generate one single image using global image API
    let imagePrompt = visual_prompt;
    if (productImageBase64) {
      imagePrompt = JSON.stringify({
        prompt: visual_prompt,
        negative_prompt: "human, person, people", // assume no humans to protect product if it's not requested
      });
    }

    const imagePath = await aiOrchestrator.generateImage(imagePrompt, 0, productImageBase64, productImageMimeType);
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
    
    // 3. Google Veo 3 Video Generation
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token;
    const projectId = process.env.VERTEX_AI_PROJECT_ID || await auth.getProjectId();
    
    const outputBucket = process.env.VEO_STORAGE_BUCKET || `anysocial-veo-videos-${projectId}`;
    const outputGcsUri = `gs://${outputBucket}/veo_outputs/`;

    // Ensure bucket exists
    const gcs = await import('@google-cloud/storage');
    const initStorage = new gcs.Storage();
    const bucket = initStorage.bucket(outputBucket);
    const [exists] = await bucket.exists();
    if (!exists) {
      await bucket.create({ location: 'us-central1' });
    }

    const veoModelId = process.env.VEO_MODEL || process.env.VEO_MODEL_ID || 'veo-3.0-fast-generate-001';
    const veoUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${veoModelId}:predictLongRunning`;
    
    const veoInstance: any = { prompt: visual_prompt };
    if (generatedImageBase64) {
      veoInstance.image = {
        bytesBase64Encoded: generatedImageBase64,
        mimeType: "image/jpeg"
      };
    }

    const veoPayload = {
      instances: [veoInstance],
      parameters: {
        storageUri: outputGcsUri,
        aspectRatio: "9:16",
        sampleCount: 1,
        durationSeconds: 8,
        resolution: "720p"
      }
    };

    const veoRes = await fetch(veoUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(veoPayload)
    });

    if (!veoRes.ok) {
      const errText = await veoRes.text();
      throw new Error(`Veo API Error: ${errText}`);
    }

    const veoInit = await veoRes.json() as any;
    const operationName = veoInit.name;

    await updateProgress('⏳ Veo 3 is rendering video (this takes a few minutes)...');
    
    // Poll for completion
    const veoResult = await pollVeoOperation(operationName, token as string);
    
    await updateProgress('📥 Downloading rendered video from Google Cloud Storage...');
    
    const { Storage } = await import('@google-cloud/storage');
    const storage = new Storage();
    
    const gcsUri = veoResult?.videos?.[0]?.gcsUri || veoResult?.generatedSamples?.[0]?.video?.uri;
    if (!gcsUri) throw new Error("No video URI returned from Veo 3 API");
    
    // Parse gs://bucket-name/path/to/video.mp4
    const gcsPathParts = gcsUri.replace('gs://', '').split('/');
    const targetBucket = gcsPathParts.shift();
    const gcsFilePath = gcsPathParts.join('/');
    
    const gcsVideoFile = storage.bucket(targetBucket).file(gcsFilePath);

    const rawVideoFilename = `veo_raw_${Date.now()}.mp4`;
    const localRawVideo = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'reels', rawVideoFilename);
    await gcsVideoFile.download({ destination: localRawVideo });
    const publicRawVideoUrl = `/uploads/reels/${rawVideoFilename}`;

    await updateProgress('🔤 Applying final text composition & styles...', {
      rawVideoUrl: publicRawVideoUrl
    });

    // 4. Final composition: Text on video
    const finalVideoFilename = `veo_final_${Date.now()}.mp4`;
    const finalVideoPath = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'reels', finalVideoFilename);
    
    // We will use FFmpeg to draw text
    const ffmpeg = (await import('fluent-ffmpeg')).default;
    
    let drawtextFilters: string[] = [];
    if (format === 'creator') {
      // Split by sentence boundaries, clean whitespace
      const sentences = script.split(/[.!?]+/).map((s: string) => s.trim()).filter(Boolean);
      const totalDuration = 8; // default duration is 8 seconds
      const sentenceDuration = totalDuration / Math.max(1, sentences.length);

      sentences.forEach((sentence: string, index: number) => {
        const start = index * sentenceDuration;
        const end = (index + 1) * sentenceDuration;
        const escaped = escapeFfmpegText(sentence);
        
        let filter = '';
        if (subtitleStyle === 'orange-box') {
          filter = `drawtext=text='${escaped}':fontcolor=white:fontsize=40:box=1:boxcolor=#FF6B00@0.9:boxborderw=12:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;
        } else if (subtitleStyle === 'blue-box') {
          filter = `drawtext=text='${escaped}':fontcolor=white:fontsize=40:box=1:boxcolor=#0055FF@0.9:boxborderw=12:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;
        } else if (subtitleStyle === 'outline') {
          filter = `drawtext=text='${escaped}':fontcolor=white:fontsize=44:borderw=4:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;
        } else { // minimal (Instagram-style sans-serif default)
          filter = `drawtext=text='${escaped}':fontcolor=white:fontsize=36:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'`;
        }
        drawtextFilters.push(filter);
      });
    } else {
      const sentence = script.substring(0, 100).replace(/'/g, "\u2019").replace(/:/g, '\\\\:');
      let filter = '';
      if (subtitleStyle === 'orange-box') {
        filter = `drawtext=text='${sentence}':fontcolor=white:fontsize=48:box=1:boxcolor=#FF6B00@0.9:boxborderw=15:x=(w-text_w)/2:y=(h-text_h)/2`;
      } else if (subtitleStyle === 'blue-box') {
        filter = `drawtext=text='${sentence}':fontcolor=white:fontsize=48:box=1:boxcolor=#0055FF@0.9:boxborderw=15:x=(w-text_w)/2:y=(h-text_h)/2`;
      } else if (subtitleStyle === 'outline') {
        filter = `drawtext=text='${sentence}':fontcolor=white:fontsize=54:borderw=4:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2`;
      } else { // minimal
        filter = `drawtext=text='${sentence}':fontcolor=white:fontsize=40:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2`;
      }
      drawtextFilters.push(filter);
    }

    await new Promise((resolve, reject) => {
      ffmpeg(localRawVideo)
        .videoFilters(drawtextFilters)
        .outputOptions(['-c:v libx264', '-preset fast', '-crf 23', '-c:a copy'])
        .save(finalVideoPath)
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
