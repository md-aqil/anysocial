import { Router } from 'express';
import { feedCurationService } from '../services/feed-curation.service.js';
import { jwtAuth } from '../middleware/jwt-auth.js';
import { Platform } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../logger/pino.js';

const router = Router();

// GET /api/curation/feed/:platform
// Fetches organic posts from the platform
router.get('/feed/:platform', jwtAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const platform = req.params.platform.toUpperCase() as Platform;

    if (!Object.values(Platform).includes(platform)) {
      res.status(400).json({ error: 'Invalid platform' });
      return;
    }

    const posts = await feedCurationService.fetchFeed(userId, platform);
    res.json({ success: true, posts });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch curation feed');
    res.status(500).json({ error: error.message });
  }
});

// POST /api/curation/select
// Saves selected posts to the database
const selectPostsSchema = z.object({
  platform: z.nativeEnum(Platform),
  posts: z.array(z.object({
    externalPostId: z.string(),
    content: z.string().nullable(),
    mediaUrls: z.array(z.string()),
    metrics: z.any().optional(),
    publishedAt: z.string().transform(str => new Date(str)),
  }))
});

router.post('/select', jwtAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const validationResult = selectPostsSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({ error: 'Validation failed', details: validationResult.error.errors });
      return;
    }

    const { platform, posts } = validationResult.data;

    await feedCurationService.saveCuratedPosts(userId, platform, posts as any);
    res.json({ success: true, message: 'Curated posts saved successfully' });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to save curated posts');
    res.status(500).json({ error: error.message });
  }
});

// GET /api/curation/public/:userId
// Gets the curated feed for public profile display
router.get('/public/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const platform = req.query.platform as Platform | undefined;

    const posts = await feedCurationService.getCuratedFeed(userId, platform);
    res.json({ success: true, posts });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to get public curated feed');
    res.status(500).json({ error: error.message });
  }
});

export const curationRoutes = router;
