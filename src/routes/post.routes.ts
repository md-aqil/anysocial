import { Router, Request, Response } from 'express';
import { postingEngine } from '../services/posting-engine.service.js';
import { OAuthError } from '../errors/oauth.error.js';
import { z } from 'zod';
import multer from 'multer';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    files: 10
  }
});

// Zod validation schema
const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  title: z.string().optional(),
  platforms: z.array(z.string()).min(1),
  scheduledAt: z.string().optional(), // ISO 8601
  timezone: z.string(),
  publishNow: z.boolean().optional()
});

import { jwtAuth } from '../middleware/jwt-auth.js';

// Authenticate and validate JWT for all post routes
const requireAuth = jwtAuth;

/**
 * POST /api/posts
 * Create a new post (draft or scheduled)
 */
router.post('/', requireAuth, upload.array('media', 10), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Parse form data
    const body = JSON.parse(req.body.data || '{}');
    const validationResult = createPostSchema.safeParse(body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
      return;
    }

    const { content, title, platforms, scheduledAt, timezone, publishNow } = validationResult.data;
    
    // Extract optional platformOptions safely from form body since we appended it separately
    let platformOptions = {};
    if (req.body.platformOptions) {
      try {
        platformOptions = JSON.parse(req.body.platformOptions);
      } catch (e) { }
    }

    // Process uploaded media files
    const files = req.files as Express.Multer.File[] | undefined;
    const media = (files || []).map((file) => ({
      file: file.buffer,
      type: file.mimetype.startsWith('video') ? 'video' as const : 'image' as const,
      originalName: file.originalname
    }));

    // Create draft or schedule/publish
    let result;
    if (scheduledAt || publishNow) {
      result = await postingEngine.schedulePost(userId, {
        content,
        title,
        media,
        platforms,
        scheduledAt,
        timezone,
        platformOptions
      });
    } else {
      result = await postingEngine.createDraft(userId, {
        content,
        title,
        media,
        platforms,
        timezone,
        platformOptions
      });
    }

    res.status(201).json(result);
  } catch (error: any) {
    // Platform-specific validation errors (e.g. Instagram rules)
    if (error.name === 'MediaValidationError') {
      res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details
      });
      return;
    }

    // Scheduling errors
    if (error.name === 'SchedulingError') {
      res.status(400).json({
        error: error.message,
        code: error.code
      });
      return;
    }

    // Generic fallback for other errors
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/posts/:id
 * Get post status and platform results
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const post = await postingEngine.getPostStatus(id, userId);

    res.json(post);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Post not found') {
      res.status(404).json({ error: message });
      return;
    }

    if (message === 'Unauthorized') {
      res.status(403).json({ error: message });
      return;
    }

    res.status(500).json({ error: message });
  }
});

/**
 * PUT /api/posts/:id
 * Update draft post
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { content, title, platforms, timezone } = req.body;

    const updated = await postingEngine.updateDraft(id, userId, {
      content,
      title,
      platforms,
      timezone
    });

    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('DRAFT')) {
      res.status(400).json({ error: message });
      return;
    }

    if (message === 'Post not found') {
      res.status(404).json({ error: message });
      return;
    }

    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/posts/:id
 * Delete post permanently
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    await postingEngine.deletePost(id, userId);

    res.json({ success: true, message: 'Post deleted completely' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message === 'Post not found') {
      res.status(404).json({ error: message });
      return;
    }

    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/posts
 * List user's posts with optional filters
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { status, platform, limit, offset } = req.query;

    const posts = await postingEngine.listPosts(userId, {
      status: status as string,
      platform: platform as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json({ posts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/posts/preview
 * Preview platform-formatted content without publishing
 */
router.post('/preview', requireAuth, async (req: Request, res: Response) => {
  try {
    const { content, platform } = req.body;

    if (!content || !platform) {
      res.status(400).json({ error: 'content and platform are required' });
      return;
    }

    // Get adapter and prepare content
    const adapters: Record<string, any> = {
      INSTAGRAM: (await import('../adapters/instagram.adapter.js')).instagramAdapter,
      FACEBOOK: (await import('../adapters/facebook.adapter.js')).facebookAdapter,
      TWITTER: (await import('../adapters/twitter.adapter.js')).twitterAdapter,
      LINKEDIN: (await import('../adapters/linkedin.adapter.js')).linkedinAdapter,
      YOUTUBE: (await import('../adapters/youtube.adapter.js')).youtubeAdapter,
    };

    const adapter = adapters[platform.toUpperCase()];
    if (!adapter) {
      res.status(400).json({ error: `Platform ${platform} not supported` });
      return;
    }

    const payload = adapter.prepareContent(content, platform);
    const validation = adapter.validatePayload(payload);

    res.json({
      platform,
      originalContent: content,
      formattedContent: payload.caption,
      validation,
      metadata: payload.metadata
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export const postRoutes = router;
