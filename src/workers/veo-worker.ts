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
  // Vertex AI sometimes includes the model path in the operation name, which breaks the GetOperation endpoint
  const cleanOperationName = operationName.replace(/\/publishers\/[^\/]+\/models\/[^\/]+/, '');
  const url = `https://us-central1-aiplatform.googleapis.com/v1/${cleanOperationName}`;
  while (true) {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error(`Veo polling failed: ${res.statusText}`);
    const data = await res.json() as any;
    if (data.done) {
      if (data.error) throw new Error(`Veo generation error: ${data.error.message}`);
      return data.response;
    }
    // Wait 10 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
}

class VeoGenerationWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker('veo-generation', async (job: Job) => {
  const { reelId, topic, subtitleStyle, productImageBase64, productImageMimeType } = job.data;
  logger.info({ event: 'veo_generation_started', reelId, topic, hasImage: !!productImageBase64 });

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
    if (productImageBase64) {
      scriptPrompt = `Write a short, viral script about: ${topic}. Also provide a highly detailed 1-sentence visual description of what the video should show. Since a product image is provided, ensure the visual prompt explicitly instructs to keep the product identical and unaltered. Format as JSON: { "script": "...", "visual_prompt": "..." }`;
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
    const projectId = await auth.getProjectId();
    
    const outputBucket = process.env.VEO_STORAGE_BUCKET || 'anysocial-veo-videos';
    const outputGcsUri = `gs://${outputBucket}/veo_outputs/`;

    const veoModelId = process.env.VEO_MODEL_ID || 'veo-3.0-generate-001';
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
        sampleCount: 1,
        resolution: "1080p"
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
    const [files] = await storage.bucket(outputBucket).getFiles({ prefix: 'veo_outputs/' });
    files.sort((a: any, b: any) => (b.metadata.timeCreated ? new Date(b.metadata.timeCreated).getTime() : 0) - (a.metadata.timeCreated ? new Date(a.metadata.timeCreated).getTime() : 0));
    
    let gcsVideoFile = files.find((f: any) => f.name.endsWith('.mp4'));
    if (!gcsVideoFile) throw new Error("No video file found in Veo output bucket");

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
    
    // Split script into sentences for blocky drawing
    const sentence = script.substring(0, 100).replace(/'/g, "\u2019").replace(/:/g, '\\\\:');
    
    let drawtextStr = '';
    if (subtitleStyle === 'orange-box') {
      drawtextStr = `drawtext=text='${sentence}':fontcolor=white:fontsize=48:box=1:boxcolor=#FF6B00@0.9:boxborderw=15:x=(w-text_w)/2:y=(h-text_h)/2`;
    } else if (subtitleStyle === 'blue-box') {
      drawtextStr = `drawtext=text='${sentence}':fontcolor=white:fontsize=48:box=1:boxcolor=#0055FF@0.9:boxborderw=15:x=(w-text_w)/2:y=(h-text_h)/2`;
    } else if (subtitleStyle === 'outline') {
      drawtextStr = `drawtext=text='${sentence}':fontcolor=white:fontsize=54:borderw=4:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2`;
    } else { // minimal
      drawtextStr = `drawtext=text='${sentence}':fontcolor=white:fontsize=40:shadowcolor=black@0.7:shadowx=2:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2`;
    }

    await new Promise((resolve, reject) => {
      ffmpeg(localRawVideo)
        .videoFilters(drawtextStr)
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
