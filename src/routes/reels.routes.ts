import { Router } from 'express';
import { z } from 'zod';
import { jwtAuth as requireAuth } from '../middleware/jwt-auth.js';
import { prisma } from '../db/prisma.js';
import { queueReelGeneration } from '../queues/reel-queue.js';

const router = Router();

// Validation schema for creating a reel series
const createReelSeriesSchema = z.object({
  niche: z.string().optional().nullable(),
  customPrompt: z.string().optional().nullable(),
  language: z.string(),
  voiceId: z.string(),
  musicId: z.string().optional().nullable(),
  artStyle: z.string(),
  seriesName: z.string().min(1, 'Series name is required'),
  duration: z.string(),
  publishTime: z.string().optional(),
  createNow: z.boolean().optional().default(false),
  socialChannels: z.array(z.string()).optional().default([]),
});

/**
 * POST /api/reels
 * Create a new ReelSeries and schedule the first Reel generation.
 */
router.post('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    
    // Validate request body
    const validatedData = createReelSeriesSchema.parse(req.body);

    // Create the ReelSeries in the database
    const series = await prisma.reelSeries.create({
      data: {
        userId,
        name: validatedData.seriesName,
        niche: validatedData.niche || null,
        customPrompt: validatedData.customPrompt || null,
        language: validatedData.language,
        voiceId: validatedData.voiceId,
        musicId: validatedData.musicId || null,
        artStyle: validatedData.artStyle,
      },
    });

    // Determine next publish date/time based on publishTime (e.g., "12:00")
    const now = new Date();
    let scheduledDate = now;
    
    if (!validatedData.createNow && validatedData.publishTime) {
      const [hours, minutes] = validatedData.publishTime.split(':').map(Number);
      scheduledDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours || 0, minutes || 0, 0);
      
      // If the scheduled time has already passed today, schedule for tomorrow
      if (scheduledDate < now) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }
    }

    // Create the initial Reel entry (Pending Generation)
    const reel = await prisma.reel.create({
      data: {
        seriesId: series.id,
        status: 'PENDING',
        scheduledFor: scheduledDate,
        socialChannels: JSON.stringify(validatedData.socialChannels),
      },
    });

    // Enqueue BullMQ job to start generating the video asynchronously.
    await queueReelGeneration(reel.id, series.id);

    res.status(201).json({
      success: true,
      data: {
        series,
        reel,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Error creating ReelSeries:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/reels/series
 * Get all reel series for the authenticated user.
 */
router.get('/series', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const series = await prisma.reelSeries.findMany({
      where: { userId },
      include: {
        reels: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, data: series });
  } catch (error) {
    console.error('Error fetching ReelSeries:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export const reelsRoutes = router;
