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
  const url = `https://us-central1-aiplatform.googleapis.com/v1/${operationName}`;
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
    // wait 10 seconds before polling again
    await new Promise(r => setTimeout(r, 10000));
  }
}

export const veoWorker = new Worker('veo-generation', async (job: Job) => {
  const { reelId, topic, subtitleStyle, productImageBase64, productImageMimeType } = job.data;
  logger.info({ event: 'veo_generation_started', reelId, topic, hasImage: !!productImageBase64 });

  try {
    const updateProgress = async (msg: string) => {
      await prisma.reel.update({
        where: { id: reelId },
        data: { status: 'GENERATING', statusMessage: msg },
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

    await updateProgress('🎨 Generating initial image (Global AI)...');
    
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

    await updateProgress('🎬 Submitting to Google Veo 3 (Long Running)...');
    
    // 3. Google Veo 3 Video Generation
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token;
    const projectId = await auth.getProjectId();
    
    const outputBucket = process.env.VEO_STORAGE_BUCKET || 'anysocial-veo-videos';
    const outputGcsUri = `gs://${outputBucket}/veo_outputs/`;

    const veoUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/veo-3.0-generate-001:predictLongRunning`;
    
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

    const localRawVideo = path.join(os.tmpdir(), `veo_raw_${Date.now()}.mp4`);
    await gcsVideoFile.download({ destination: localRawVideo });

    await updateProgress('🔤 Applying final text composition & styles...');

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
