import { Router } from 'express';
import { z } from 'zod';
import { jwtAuth as requireAuth } from '../middleware/jwt-auth.js';
import { prisma } from '../db/prisma.js';
import { Queue } from 'bullmq';
import { redis } from '../db/redis.js';

const router = Router();

// Create the Veo queue
const veoQueue = new Queue('veo-generation', { connection: redis });

const generateVeoSchema = z.object({
  topic: z.string().min(1, 'Topic is required'),
  subtitleStyle: z.enum(['orange-box', 'blue-box', 'outline', 'minimal']).optional().default('minimal'),
  visualStyle: z.string().optional().default('scandi'),
});

/**
 * POST /api/veo/generate
 * Create a new Veo Short generation job.
 */
router.post('/generate', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const validatedData = generateVeoSchema.parse({
      topic: req.body.topic,
      subtitleStyle: req.body.subtitleStyle,
      visualStyle: req.body.visualStyle,
    });

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

    // Pass to worker queue. Store the jobId so it can be cancelled/removed later.
    const job = await veoQueue.add('generate-veo', {
      reelId: reel.id,
      topic: validatedData.topic,
      subtitleStyle: validatedData.subtitleStyle,
      visualStyle: validatedData.visualStyle,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 15_000 },
      removeOnComplete: 50,
      removeOnFail: 100,
    });

    // Persist the BullMQ job id for later cancellation.
    const existingMeta = (reel.metadata as any) || {};
    await prisma.reel.update({
      where: { id: reel.id },
      data: { metadata: { ...existingMeta, jobId: job.id } },
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

    // Auto-fail stuck reels (older than 15 minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    let updatedAny = false;

    for (const reel of reels) {
      if ((reel.status === 'PENDING' || reel.status === 'GENERATING') && reel.updatedAt < fifteenMinsAgo) {
        await prisma.reel.update({
          where: { id: reel.id },
          data: { status: 'FAILED', statusMessage: 'Generation timed out.' }
        });
        reel.status = 'FAILED';
        reel.statusMessage = 'Generation timed out.';
        updatedAny = true;
      }
    }

    res.status(200).json({
      success: true,
      data: reels
    });
  } catch (error: any) {
    console.error('Error fetching reel history:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/veo/cancel/:id
 * Cancels a stuck or running generation.
 */
router.post('/cancel/:id', requireAuth, async (req: any, res: any) => {
  try {
    const reel = await prisma.reel.findUnique({
      where: { id: req.params.id }
    });

    if (!reel) {
      return res.status(404).json({ success: false, error: 'Reel not found' });
    }
    
    if (reel.userId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    if (reel.status !== 'PENDING' && reel.status !== 'GENERATING') {
      return res.status(400).json({ success: false, error: 'Cannot cancel a completed or failed reel' });
    }

    // Best-effort removal of the queued/active BullMQ job so it stops consuming resources.
    const meta = (reel.metadata as any) || {};
    if (meta.jobId) {
      try {
        const job = await veoQueue.getJob(String(meta.jobId));
        if (job) await job.remove();
      } catch (jobErr) {
        console.warn('Failed to remove Veo job from queue:', jobErr);
      }
    }

    await prisma.reel.update({
      where: { id: reel.id },
      data: { status: 'FAILED', statusMessage: 'Generation cancelled by user.' }
    });

    res.status(200).json({ success: true, message: 'Cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling Veo Short:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
