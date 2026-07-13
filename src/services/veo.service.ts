import { Storage } from '@google-cloud/storage';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

const VEO_MODEL = process.env.VEO_MODEL || 'veo-3.0-fast-generate-001';

export class VeoService {
  private static async getAuth() {
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token!;
    const projectId = process.env.VERTEX_AI_PROJECT_ID || (await auth.getProjectId());
    return { token, projectId };
  }

  static async ensureBucket(projectId: string): Promise<string> {
    const bucketName = process.env.VEO_STORAGE_BUCKET || `anysocial-veo-videos-${projectId}`;
    const storage = new Storage();
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();
    if (!exists) {
      await bucket.create({ location: 'us-central1' });
      console.log(`[VeoService] Created bucket: ${bucketName}`);
    }
    return bucketName;
  }

  /**
   * Initiate a single Veo generation (AI Agent: text-to-video or image-to-video).
   * Uses the standard Veo 3 model.
   */
  static async initiateGeneration(
    prompt: string,
    imageBase64?: string,
    imageMimeType?: string
  ): Promise<string> {
    const { token, projectId } = await VeoService.getAuth();
    const bucketName = await VeoService.ensureBucket(projectId);
    const outputGcsUri = `gs://${bucketName}/veo_outputs/`;

    const instance: any = { prompt };
    if (imageBase64 && imageMimeType) {
      instance.image = { bytesBase64Encoded: imageBase64, mimeType: imageMimeType };
    }

    const response = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${VEO_MODEL}:predictLongRunning`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [instance],
          parameters: {
            storageUri: outputGcsUri,
            aspectRatio: '9:16',
            sampleCount: 1,
            durationSeconds: 6,
            resolution: '720p'
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Veo initiation failed: ${err}`);
    }

    const data = await response.json() as any;
    const operationName: string = data.name;
    console.log(`[VeoService] Operation started: ${operationName}`);
    return operationName;
  }

  /**
   * Ingredients to Video — ONE clip from multiple product images.
   * Uses the Veo Omni (flash) model with referenceImages for accuracy.
   * Cost: ~15 credits per video.
   */
  static async initiateIngredientsToVideo(
    prompt: string,
    images: Array<{ base64: string; mimeType: string }>
  ): Promise<string> {
    const { token, projectId } = await VeoService.getAuth();
    const bucketName = await VeoService.ensureBucket(projectId);
    const outputGcsUri = `gs://${bucketName}/veo_outputs/`;

    // Primary image as the main anchor (first frame), rest as referenceImages (subject/style)
    const instance: any = { prompt };
    if (images.length > 0) {
      instance.image = {
        bytesBase64Encoded: images[0].base64,
        mimeType: images[0].mimeType
      };
    }

    // Additional images passed as referenceImages (up to 2 more, total 3 max) inside the instance
    const referenceImages = images.slice(1, 3).map((img) => ({
      referenceType: 'asset',
      image: {
        bytesBase64Encoded: img.base64,
        mimeType: img.mimeType
      }
    }));

    if (referenceImages.length > 0) {
      instance.referenceImages = referenceImages;
    }

    const parameters: any = {
      storageUri: outputGcsUri,
      aspectRatio: '9:16',
      sampleCount: 1,
      durationSeconds: 6,
      resolution: '720p'
    };

    console.log(`[VeoService] Ingredients to Video — model: ${VEO_MODEL}, images: ${images.length}`);
    const response = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${VEO_MODEL}:predictLongRunning`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: [instance], parameters })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      // Fallback: if referenceImages not supported, retry with just the primary image
      if (referenceImages.length > 0 && (errText.includes('referenceImages') || errText.includes('400'))) {
        console.warn('[VeoService] referenceImages not supported by model, retrying with single image...');
        return VeoService.initiateIngredientsToVideo(prompt, [images[0]]);
      }
      throw new Error(`Veo Omni initiation failed: ${errText}`);
    }

    const data = await response.json() as any;
    const operationName: string = data.name;
    console.log(`[VeoService] Ingredients to Video operation started: ${operationName}`);
    return operationName;
  }

  static async pollUntilDone(
    operationName: string,
    model: string = VEO_MODEL,
    maxWaitMs: number = 600_000
  ): Promise<string> {
    const { token, projectId } = await VeoService.getAuth();

    const match = operationName.match(/^projects\/([^\/]+)\/locations\/([^\/]+)\//);
    const location = match?.[2] || 'us-central1';
    const pollUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:fetchPredictOperation`;

    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(r => setTimeout(r, 10_000));

      const pollRes = await fetch(pollUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName })
      });

      const result = await pollRes.json() as any;
      if (result.done) {
        if (result.error) throw new Error(`Veo error: ${result.error.message}`);

        const gcsUri: string =
          result.response?.videos?.[0]?.gcsUri ||
          result.response?.generatedSamples?.[0]?.video?.uri;

        if (!gcsUri) throw new Error('Veo response missing video URI');

        const gcsPath = gcsUri.replace(/^gs:\/\/[^\/]+\//, '');
        const bucketName = gcsUri.match(/^gs:\/\/([^\/]+)\//)?.[1]!;
        const storage = new Storage();
        const localPath = path.join('/tmp', `veo_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);
        await storage.bucket(bucketName).file(gcsPath).download({ destination: localPath });
        console.log(`[VeoService] Downloaded clip to ${localPath}`);
        return localPath;
      }
    }
    throw new Error('Veo generation timed out after 10 minutes');
  }
}
