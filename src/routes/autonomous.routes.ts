import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { trendDiscovery } from '../services/trend-discovery.service.js';
import { referencePostService } from '../services/reference-post.service.js';
import { autonomousWorker } from '../workers/autonomous-content-worker.js';
import { jwtAuth } from '../middleware/jwt-auth.js';

const router = Router();
router.use(jwtAuth);

// ==================== TREND DISCOVERY ====================

/**
 * POST /api/autonomous/trends/scan
 * Scan for new trends
 */
router.post('/trends/scan', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { categories = [], platforms = [] } = req.body;

    const result = await trendDiscovery.scanTrends(userId, categories, platforms);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * GET /api/autonomous/trends
 * List trends with filters
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { category, source, minScore, isSaved, limit, offset } = req.query;

    const result = await trendDiscovery.getTrends(userId, {
      category: category as string,
      source: source as string,
      minScore: minScore ? parseFloat(minScore as string) : undefined,
      isSaved: isSaved === 'true' ? true : isSaved === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * GET /api/autonomous/trends/stats
 * Get trend statistics
 */
router.get('/trends/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const stats = await trendDiscovery.getStats(userId);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * POST /api/autonomous/trends/:id/save
 * Toggle save status of a trend
 */
router.post('/trends/:id/save', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const trend = await trendDiscovery.toggleSave(userId, id);
    res.json({ success: true, trend });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * DELETE /api/autonomous/trends/:id
 * Delete a trend
 */
router.delete('/trends/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    await trendDiscovery.deleteTrend(userId, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ==================== REFERENCE POSTS ====================

/**
 * POST /api/autonomous/references
 * Create a reference post
 */
router.post('/references', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { title, url, platform, contentType, caption, hashtags, mood, aesthetic, notes } = req.body;

    const post = await referencePostService.create(userId, {
      title, url, platform, contentType, caption, hashtags, mood, aesthetic, notes
    });

    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * GET /api/autonomous/references
 * List reference posts
 */
router.get('/references', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { platform, isFavorite, limit, offset } = req.query;

    const result = await referencePostService.getPosts(userId, {
      platform: platform as string,
      isFavorite: isFavorite === 'true' ? true : isFavorite === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * GET /api/autonomous/references/stats
 * Get reference post statistics
 */
router.get('/references/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const stats = await referencePostService.getStats(userId);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * GET /api/autonomous/references/:id
 * Get a single reference post
 */
router.get('/references/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const post = await referencePostService.getPost(userId, id);
    if (!post) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * PUT /api/autonomous/references/:id
 * Update a reference post
 */
router.put('/references/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const post = await referencePostService.update(userId, id, req.body);
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * DELETE /api/autonomous/references/:id
 * Delete a reference post
 */
router.delete('/references/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    await referencePostService.delete(userId, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * POST /api/autonomous/references/:id/analyze
 * Analyze style of a reference post
 */
router.post('/references/:id/analyze', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const analysis = await referencePostService.analyzeStyle(userId, id);
    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * GET /api/autonomous/references/:id/similar
 * Get similar reference posts
 */
router.get('/references/:id/similar', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    const posts = await referencePostService.getSimilarPosts(userId, id, limit);
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ==================== AUTONOMOUS CONFIG ====================

/**
 * GET /api/autonomous/config
 * Get autonomous configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    let config = await prisma.autonomousConfig.findUnique({
      where: { userId }
    });

    if (!config) {
      config = await prisma.autonomousConfig.create({
        data: { userId }
      });
    }

    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * PUT /api/autonomous/config
 * Update autonomous configuration
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { isEnabled, scanFrequency, trendCategories, platforms, minEngagement,
            autoGenerate, autoSchedule, voiceId, language, niche, targetAudience,
            brandTone, maxPostsPerDay, minScore, referencePostIds } = req.body;

    const config = await prisma.autonomousConfig.upsert({
      where: { userId },
      update: {
        isEnabled,
        scanFrequency,
        trendCategories: trendCategories ? JSON.stringify(trendCategories) : undefined,
        platforms: platforms ? JSON.stringify(platforms) : undefined,
        minEngagement,
        autoGenerate,
        autoSchedule,
        voiceId,
        language,
        niche,
        targetAudience,
        brandTone,
        maxPostsPerDay,
        minScore,
        referencePostIds: referencePostIds ? JSON.stringify(referencePostIds) : undefined
      },
      create: { userId }
    });

    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ==================== WORKER CONTROL ====================

/**
 * POST /api/autonomous/worker/start
 * Start the autonomous worker
 */
router.post('/worker/start', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    await autonomousWorker.start(userId);
    res.json({ success: true, message: 'Worker started' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * POST /api/autonomous/worker/stop
 * Stop the autonomous worker
 */
router.post('/worker/stop', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    await autonomousWorker.stop(userId);
    res.json({ success: true, message: 'Worker stopped' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * POST /api/autonomous/worker/scan
 * Trigger a manual scan cycle
 */
router.post('/worker/scan', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const result = await autonomousWorker.runCycle(userId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/**
 * GET /api/autonomous/worker/status
 * Get worker status
 */
router.get('/worker/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const isRunning = autonomousWorker.isWorkerRunning(userId);
    const config = await prisma.autonomousConfig.findUnique({ where: { userId } });
    
    res.json({
      success: true,
      status: {
        isRunning,
        isEnabled: config?.isEnabled || false,
        scanFrequency: config?.scanFrequency || 'hourly'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// ==================== DASHBOARD STATS ====================

/**
 * GET /api/autonomous/stats
 * Get combined autonomous stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const [trendStats, referenceStats, config, workerStatus] = await Promise.all([
      trendDiscovery.getStats(userId),
      referencePostService.getStats(userId),
      prisma.autonomousConfig.findUnique({ where: { userId } }),
      Promise.resolve(autonomousWorker.isWorkerRunning(userId))
    ]);

    const pendingTasks = await prisma.hermesTask.count({
      where: { userId, type: 'GENERATE_CONTENT', status: 'PENDING' }
    });

    res.json({
      success: true,
      stats: {
        trends: trendStats,
        references: referenceStats,
        config: config || { isEnabled: false, scanFrequency: 'hourly' },
        workerStatus: {
          isRunning: workerStatus,
          pendingTasks
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

export const autonomousRoutes = router;
