import { Router } from 'express';
import { z } from 'zod';
import { jwtAuth as requireAuth } from '../middleware/jwt-auth.js';
import { prisma } from '../db/prisma.js';
import { queueReelGeneration, reelGenerationQueue } from '../queues/reel-queue.js';
import { scheduleNextReel, getNextScheduledDate } from '../services/reel-scheduler.service.js';

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
  scheduleDays: z.array(z.string()).optional().default([]),
  createNow: z.boolean().optional().default(false),
  socialChannels: z.array(z.string()).optional().default([]),
  timezoneOffset: z.number().optional(),
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
        duration: validatedData.duration,
        scheduleDays: JSON.stringify(validatedData.scheduleDays),
        scheduleTime: validatedData.publishTime || null,
        timezoneOffset: validatedData.timezoneOffset !== undefined ? validatedData.timezoneOffset : null,
        socialChannels: JSON.stringify(validatedData.socialChannels),
      },
    });

    // Determine next publish date/time based on publishTime (e.g., "12:00") and scheduleDays
    const now = new Date();
    let scheduledDate = now;
    
    if (!validatedData.createNow && validatedData.publishTime) {
      scheduledDate = getNextScheduledDate(
        JSON.stringify(validatedData.scheduleDays),
        validatedData.publishTime,
        validatedData.timezoneOffset
      );
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

    // Enqueue BullMQ job to start generating the video asynchronously with correct delay
    const delay = Math.max(0, scheduledDate.getTime() - Date.now());
    await reelGenerationQueue.add(
      'generate-reel',
      { reelId: reel.id, seriesId: series.id },
      {
        jobId: `reel-${reel.id}`,
        delay,
      }
    );

    res.status(201).json({
      success: true,
      data: {
        series,
        reel,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('Error creating ReelSeries:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      details: error?.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined 
    });
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

/**
 * GET /api/reels/series/:seriesId
 * Get a specific reel series.
 */
router.get('/series/:seriesId', requireAuth, async (req: any, res: any) => {
  try {
    const { seriesId } = req.params;
    const userId = req.userId;
    const series = await prisma.reelSeries.findUnique({
      where: { id: seriesId, userId },
      include: { reels: true }
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }
    res.status(200).json({ success: true, data: series });
  } catch (error) {
    console.error('Error fetching ReelSeries:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/reels/series/:seriesId
 * Update a specific reel series.
 */
router.put('/series/:seriesId', requireAuth, async (req: any, res: any) => {
  try {
    const { seriesId } = req.params;
    const userId = req.userId;
    const { name, isActive, voiceId, artStyle, socialChannels, scheduleDays, scheduleTime, timezoneOffset } = req.body;
    
    const series = await prisma.reelSeries.findUnique({
      where: { id: seriesId, userId },
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    const updatedSeries = await prisma.reelSeries.update({
      where: { id: seriesId },
      data: { 
        name: name !== undefined ? name : series.name,
        isActive: isActive !== undefined ? isActive : series.isActive,
        voiceId: voiceId !== undefined ? voiceId : series.voiceId,
        artStyle: artStyle !== undefined ? artStyle : series.artStyle,
        socialChannels: socialChannels !== undefined ? (typeof socialChannels === 'string' ? socialChannels : JSON.stringify(socialChannels)) : series.socialChannels,
        scheduleDays: scheduleDays !== undefined ? (typeof scheduleDays === 'string' ? scheduleDays : JSON.stringify(scheduleDays)) : series.scheduleDays,
        scheduleTime: scheduleTime !== undefined ? scheduleTime : series.scheduleTime,
        timezoneOffset: timezoneOffset !== undefined ? timezoneOffset : series.timezoneOffset
      }
    });

    res.status(200).json({ success: true, data: updatedSeries });
  } catch (error) {
    console.error('Error updating ReelSeries:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/reels/series/:seriesId/generate
 * Manually trigger the generation of a new reel for an existing series.
 */
router.post('/series/:seriesId/generate', requireAuth, async (req: any, res: any) => {
  try {
    const { seriesId } = req.params;
    const userId = req.userId;

    const series = await prisma.reelSeries.findUnique({
      where: { id: seriesId, userId },
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    // Create the new Reel entry, inheriting socialChannels from the series
    const reel = await prisma.reel.create({
      data: {
        seriesId: series.id,
        status: 'PENDING',
        socialChannels: series.socialChannels, // Inherit social channels from the parent series
      },
    });

    // Enqueue BullMQ job
    await queueReelGeneration(reel.id, series.id);

    res.status(201).json({
      success: true,
      data: reel,
    });
  } catch (error) {
    console.error('Error manually generating reel:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/reels/series/:seriesId/toggle-active
 * Toggles the isActive status of the series (Stop/Start auto-posting)
 */
router.patch('/series/:seriesId/toggle-active', requireAuth, async (req: any, res: any) => {
  try {
    const { seriesId } = req.params;
    const userId = req.userId;

    const series = await prisma.reelSeries.findUnique({
      where: { id: seriesId, userId },
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    const updatedSeries = await prisma.reelSeries.update({
      where: { id: seriesId },
      data: { isActive: !series.isActive },
    });

    if (updatedSeries.isActive) {
      // Automatically trigger scheduling the next reel since series is active now
      await scheduleNextReel(seriesId);
    }

    res.status(200).json({ success: true, data: updatedSeries });
  } catch (error) {
    console.error('Error toggling series active state:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/reels/series/:seriesId
 * Deletes a series and all its associated reels
 */
router.delete('/series/:seriesId', requireAuth, async (req: any, res: any) => {
  try {
    const { seriesId } = req.params;
    const userId = req.userId;

    const series = await prisma.reelSeries.findUnique({
      where: { id: seriesId, userId },
    });

    if (!series) {
      return res.status(404).json({ success: false, error: 'Series not found' });
    }

    // Delete associated reels first
    await prisma.reel.deleteMany({
      where: { seriesId },
    });

    await prisma.reelSeries.delete({
      where: { id: seriesId },
    });

    res.status(200).json({ success: true, message: 'Series deleted successfully' });
  } catch (error) {
    console.error('Error deleting series:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export const reelsRoutes = router;
