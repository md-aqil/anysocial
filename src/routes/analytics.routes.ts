import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AnalyticsFetcherService } from '../services/analytics-fetcher.service.js';
import { AnalyticsAggregatorService } from '../services/analytics-aggregator.service.js';

const router = Router();

const dateRangeSchema = z.object({
  start: z.string().transform((val) => new Date(val)),
  end: z.string().transform((val) => new Date(val)),
});

const refreshSchema = z.object({
  postId: z.string().uuid(),
});

router.get('/posts/:postId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { postId } = req.params;

    const post = await import('../services/posting-engine.service.js').then((m) => 
      m.postingEngine.getPostStatus(postId, userId)
    );

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const cached = await AnalyticsFetcherService.getCachedAnalytics(postId, 'ALL');
    const results = await import('../db/prisma.js').then((m) =>
      m.prisma.postAnalytics.findMany({
        where: { postId },
        orderBy: { lastFetchedAt: 'desc' },
      })
    );

    res.json({
      post,
      analytics: results,
      cached,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics';
    res.status(500).json({ error: message });
  }
});

router.post('/refresh/:postId', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const validation = refreshSchema.safeParse({ postId });

    if (!validation.success) {
      res.status(400).json({ error: 'Invalid post ID' });
      return;
    }

    const results = await AnalyticsFetcherService.fetchPostAnalytics(postId);

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to refresh analytics';
    res.status(500).json({ error: message });
  }
});

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { days } = req.query;
    const daysNum = parseInt(days as string) || 7;

    const summary = await AnalyticsAggregatorService.getUserSummary(userId, daysNum);

    res.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch summary';
    res.status(500).json({ error: message });
  }
});

router.get('/posts', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { start, end } = req.query;

    let dateRange;
    if (start && end) {
      const validation = dateRangeSchema.safeParse({ start, end });
      if (validation.success) {
        dateRange = validation.data;
      }
    }

    const posts = await AnalyticsAggregatorService.getPostsAnalytics(userId, dateRange);

    res.json({ posts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch posts analytics';
    res.status(500).json({ error: message });
  }
});

router.get('/export', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { start, end, format } = req.query;

    if (!start || !end) {
      res.status(400).json({ error: 'start and end dates are required' });
      return;
    }

    const validation = dateRangeSchema.safeParse({ start, end });
    if (!validation.success) {
      res.status(400).json({ error: 'Invalid date range' });
      return;
    }

    const formatType = (format as string) || 'csv';
    const buffer = await AnalyticsAggregatorService.generateReport(userId, validation.data, formatType as any);

    const contentType = formatType === 'json' ? 'application/json' : 
                        formatType === 'pdf' ? 'application/pdf' : 'text/csv';
    
    const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.${formatType}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate report';
    res.status(500).json({ error: message });
  }
});

export const analyticsRoutes = router;