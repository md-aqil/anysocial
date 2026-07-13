import { Storage } from '@google-cloud/storage';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';

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

  static async initiateGeneration(
    prompt: string,
    imageBase64?: string,
    imageMimeType?: string
  ): Promise<string> {
    const { token, projectId } = await VeoService.getAuth();
    const bucketName = await VeoService.ensureBucket(projectId);
    const outputGcsUri = `gs://${bucketName}/veo_outputs/`;
    const MODEL = 'veo-3.0-generate-001';

    const instance: any = { prompt };
    if (imageBase64 && imageMimeType) {
      instance.image = { bytesBase64Encoded: imageBase64, mimeType: imageMimeType };
    }

    const response = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/${MODEL}:predictLongRunning`,
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

  static async pollUntilDone(
    operationName: string,
    maxWaitMs: number = 600_000 // 10 minutes
  ): Promise<string> {
    const { token, projectId } = await VeoService.getAuth();

    const match = operationName.match(/^projects\/([^\/]+)\/locations\/([^\/]+)\//);
    const location = match?.[2] || 'us-central1';
    const pollUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-3.0-generate-001:fetchPredictOperation`;

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

        // Download to local temp
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

  /**
   * Generate multiple Veo clips in parallel (one per image+prompt pair).
   * Returns array of local .mp4 file paths in the same order as inputs.
   */
  static async generateFromImages(
    inputs: Array<{ base64: string; mimeType: string; motionPrompt: string }>,
    onProgress?: (msg: string) => Promise<void>
  ): Promise<string[]> {
    if (onProgress) await onProgress(`🎬 Starting Veo 3 generation for ${inputs.length} product images in parallel...`);

    // Initiate all operations concurrently
    const operationNames = await Promise.all(
      inputs.map((inp, i) => {
        console.log(`[VeoService] Initiating clip ${i + 1}/${inputs.length}: "${inp.motionPrompt.slice(0, 60)}"`);
        return VeoService.initiateGeneration(inp.motionPrompt, inp.base64, inp.mimeType);
      })
    );

    if (onProgress) await onProgress(`⏳ Veo 3 rendering ${inputs.length} product clips... (this takes ~2-3 min)`);

    // Poll all concurrently
    const localPaths = await Promise.all(
      operationNames.map((opName, i) => {
        console.log(`[VeoService] Polling clip ${i + 1}: ${opName}`);
        return VeoService.pollUntilDone(opName);
      })
    );

    if (onProgress) await onProgress(`✅ All ${inputs.length} Veo clips ready!`);
    return localPaths;
  }
}
