import { Router, Request, Response } from 'express';
import { VeoService } from '../services/veo.service.js';
import { Storage } from '@google-cloud/storage';
import path from 'path';

const router = Router();

// Retrieve API key from environment, or use a default fallback
const API_KEY = process.env.PUBLIC_VEO_API_KEY || 'veo_default_secret_key_123';

// Simple API Key validation middleware
const checkApiKey = (req: Request, res: Response, next: any) => {
  const incomingKey = req.headers['x-api-key'] || req.query.api_key;
  if (!incomingKey || incomingKey !== API_KEY) {
    res.status(401).json({ error: 'Unauthorized: Invalid x-api-key header or api_key query param' });
    return;
  }
  next();
};

/**
 * POST /api/public/veo/generate
 * Initiates video generation from another project.
 */
router.post('/generate', checkApiKey, async (req: Request, res: Response) => {
  try {
    const { prompt, imageBase64, imageMimeType, durationSeconds, model } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const operationName = await VeoService.initiateGeneration(
      prompt,
      imageBase64,
      imageMimeType,
      {
        durationSeconds: durationSeconds || 6,
        model: model || process.env.VEO_MODEL || 'veo-3.0-fast-generate-001'
      }
    );

    return res.json({ success: true, operationName });
  } catch (error: any) {
    console.error('[PublicVeo] Generate error:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/public/veo/poll
 * Polls status and returns the public download URL when generation is complete.
 */
router.post('/poll', checkApiKey, async (req: Request, res: Response) => {
  try {
    const { operationName, model } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token;
    const projectId = process.env.VERTEX_AI_PROJECT_ID || await auth.getProjectId();

    const match = operationName.match(/^projects\/([^\/]+)\/locations\/([^\/]+)\//);
    const location = match?.[2] || 'us-central1';
    const modelToUse = model || process.env.VEO_MODEL || 'veo-3.0-fast-generate-001';
    const pollUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelToUse}:fetchPredictOperation`;

    const pollRes = await fetch(pollUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ operationName })
    });

    if (!pollRes.ok) {
      throw new Error(`Polling API error: ${await pollRes.text()}`);
    }

    const result = await pollRes.json() as any;
    if (!result.done) {
      return res.json({ status: 'pending' });
    }

    if (result.error) {
      throw new Error(result.error.message || 'Generation failed');
    }

    const videoUri: string =
      result.response?.videos?.[0]?.gcsUri ||
      result.response?.generatedSamples?.[0]?.video?.uri;

    if (!videoUri) {
      throw new Error('No video URI in Veo response');
    }

    const storage = new Storage();
    const gcsPathParts = videoUri.replace('gs://', '').split('/');
    const bucket = gcsPathParts.shift()!;
    const filePath = gcsPathParts.join('/');
    const filename = `veo_public_${Date.now()}.mp4`;
    const localPath = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'reels', filename);

    await storage.bucket(bucket).file(filePath).download({ destination: localPath });

    // Build the absolute url of the completed video
    const baseUrl = process.env.BASE_URL || 'https://socialsched.vibeship.in';
    return res.json({
      status: 'done',
      url: `${baseUrl}/uploads/reels/${filename}`
    });
  } catch (error: any) {
    console.error('[PublicVeo] Poll error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
