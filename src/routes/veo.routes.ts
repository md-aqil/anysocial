import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware.js';
import { prisma } from '../db/prisma.js';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const router = Router();

// Configure Redis connection for BullMQ
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

// Create the Veo queue
const veoQueue = new Queue('veo-generation', { connection: redisConnection });

const generateVeoSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  subtitleStyle: z.string().optional().default('orange-box'), // orange-box, blue-box, outline, minimal
});

/**
 * POST /api/veo/generate
 * Create a new Veo Short generation job.
 */
router.post('/generate', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const validatedData = generateVeoSchema.parse(req.body);

    const reel = await prisma.reel.create({
      data: {
        userId,
        type: 'VEO_SHORT',
        status: 'PENDING',
        script: validatedData.topic, // use script field to store the initial prompt/topic
        metadata: {
          subtitleStyle: validatedData.subtitleStyle,
        }
      },
    });

    // Pass to worker queue
    await veoQueue.add('generate-veo', {
      reelId: reel.id,
      topic: validatedData.topic,
      subtitleStyle: validatedData.subtitleStyle,
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

export default router;
