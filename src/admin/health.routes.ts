import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { redis } from '../db/redis.js';
import { postQueue } from '../queues/post-queue.js';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, any> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latency: 0 };
  } catch (error) {
    checks.database = { status: 'unhealthy', error: (error as Error).message };
  }

  try {
    const start = Date.now();
    await redis.ping();
    checks.redis = { status: 'healthy', latency: Date.now() - start };
  } catch (error) {
    checks.redis = { status: 'unhealthy', error: (error as Error).message };
  }

  try {
    const [waiting, active, completed, failed] = await Promise.all([
      postQueue.getWaitingCount(),
      postQueue.getActiveCount(),
      postQueue.getCompletedCount(),
      postQueue.getFailedCount(),
    ]);

    checks.queues = {
      post: {
        waiting,
        active,
        completed,
        failed,
      },
    };
  } catch (error) {
    checks.queues = { status: 'unhealthy', error: (error as Error).message };
  }

  try {
    const lastAnalytics = await prisma.postAnalytics.findFirst({
      orderBy: { lastFetchedAt: 'desc' },
    });

    checks.analytics = {
      lastFetch: lastAnalytics?.lastFetchedAt?.toISOString() || null,
    };
  } catch {
    checks.analytics = { status: 'unknown' };
  }

  const allHealthy = 
    checks.database.status === 'healthy' &&
    checks.redis.status === 'healthy' &&
    checks.queues?.post !== undefined;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalPosts,
      publishedPosts,
      failedPosts,
      connectedAccounts,
      activeWebhooks,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.post.count({ where: { status: 'FAILED' } }),
      prisma.socialAccount.count({ where: { status: 'CONNECTED' } }),
      prisma.webhookSubscription.count({ where: { isActive: true } }),
    ]);

    res.json({
      users: totalUsers,
      posts: {
        total: totalPosts,
        published: publishedPosts,
        failed: failedPosts,
      },
      connectedAccounts,
      activeWebhooks,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export const adminHealthRoutes = router;