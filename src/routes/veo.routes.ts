import { Router } from 'express';
import { z } from 'zod';
import { jwtAuth as requireAuth } from '../middleware/jwt-auth.js';
import { prisma } from '../db/prisma.js';
import { Queue } from 'bullmq';
import { redis } from '../db/redis.js';
import multer from 'multer';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Create the Veo queue
const veoQueue = new Queue('veo-generation', { connection: redis });

const generateVeoSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  subtitleStyle: z.string().optional().default('orange-box'), // orange-box, blue-box, outline, minimal
});

/**
 * POST /api/veo/generate
 * Create a new Veo Short generation job.
 */
router.post('/generate', requireAuth, upload.single('productImage'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    // Parse fields properly since they come from FormData
    const bodyData = {
      topic: req.body.topic,
      subtitleStyle: req.body.subtitleStyle,
    };
    const validatedData = generateVeoSchema.parse(bodyData);

    let productImageBase64 = null;
    let productImageMimeType = null;
    if (req.file) {
      productImageBase64 = req.file.buffer.toString('base64');
      productImageMimeType = req.file.mimetype;
    }

    const reel = await prisma.reel.create({
      data: {
        userId,
        type: 'VEO_SHORT',
        status: 'PENDING',
        script: validatedData.topic, // use script field to store the initial prompt/topic
        metadata: {
          subtitleStyle: validatedData.subtitleStyle,
          hasProductImage: !!productImageBase64
        }
      },
    });

    // Pass to worker queue
    await veoQueue.add('generate-veo', {
      reelId: reel.id,
      topic: validatedData.topic,
      subtitleStyle: validatedData.subtitleStyle,
      productImageBase64,
      productImageMimeType
    });

    res.status(201).json({
      success: true,
      data: { reel },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Error creating Veo Short:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error?.message || String(error),
    });
  }
});

/**
 * GET /api/veo/status/:id
 * Poll the status of a Veo Short reel.
 */
router.get('/status/:id', requireAuth, async (req: any, res: any) => {
  try {
    const reel = await prisma.reel.findUnique({
      where: { id: req.params.id }
    });

    if (!reel) {
      return res.status(404).json({ success: false, error: 'Reel not found' });
    }
    
    // Ensure the user owns it
    if (reel.userId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    res.status(200).json({
      success: true,
      data: reel
    });
  } catch (error: any) {
    console.error('Error fetching reel status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/veo/history
 * Fetch the user's recent Veo Shorts
 */
router.get('/history', requireAuth, async (req: any, res: any) => {
  try {
    const reels = await prisma.reel.findMany({
      where: { 
        userId: req.userId,
        type: 'VEO_SHORT'
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.status(200).json({
      success: true,
      data: reels
    });
  } catch (error: any) {
    console.error('Error fetching reel history:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
