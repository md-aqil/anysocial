import { Router, Request, Response } from 'express';
import { hermesAgent } from '../services/hermes-agent.service.js';
import { z } from 'zod';
import { jwtAuth } from '../middleware/jwt-auth.js';

const router = Router();

const createTaskSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  action: z.enum([
    'schedule_post',
    'generate_content',
    'create_campaign',
    'list_campaigns',
    'update_campaign',
    'delete_campaign',
    'list_users',
    'create_user',
    'update_user',
    'delete_user',
    'change_user_role',
    'list_accounts',
    'disconnect_account',
    'refresh_account',
    'list_posts',
    'get_post',
    'delete_post',
    'cancel_scheduled_post',
    'list_reels',
    'delete_reel',
    'get_analytics',
    'list_notifications',
    'get_settings',
    'update_settings',
    'analyze_accounts',
    'monitor_health',
    'bulk_schedule',
    'custom'
  ]),
  platforms: z.array(z.string()).optional(),
  content: z.string().optional(),
  title: z.string().optional(),
  scheduledAt: z.string().optional(),
  timezone: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  postType: z.string().optional(),
  targetRegion: z.string().optional(),
  niche: z.string().optional(),
  language: z.string().optional(),
  voiceId: z.string().optional(),
  campaignSchedule: z.string().optional(),
  socialChannels: z.array(z.string()).optional(),
  customPrompt: z.string().optional(),
  count: z.number().optional(),
  intervalHours: z.number().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  posts: z.array(z.object({
    content: z.string(),
    title: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    scheduledAt: z.string().optional(),
    timezone: z.string().optional()
  })).optional(),
  prompt: z.string().optional(),
  platformOptions: z.record(z.any()).optional(),
  websiteUrl: z.string().optional(),
  voicePrompt: z.string().optional(),
  ingredientsToVideo: z.boolean().optional(),
  imageToVideo: z.boolean().optional(),
  animateImageCount: z.number().optional(),
  targetUserId: z.string().optional(),
  role: z.string().optional(),
  accountId: z.string().optional(),
  postId: z.string().optional(),
  reelId: z.string().optional(),
  campaignId: z.string().optional(),
  isActive: z.boolean().optional(),
  isRead: z.boolean().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  status: z.string().optional(),
  days: z.number().optional(),
  settings: z.record(z.any()).optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  userName: z.string().optional()
});

router.use(jwtAuth);

/**
 * POST /api/hermes/tasks
 * Create a new Hermes agent task
 */
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const validationResult = createTaskSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
      return;
    }

    const data = validationResult.data;
    const taskPayload: any = {
      action: data.action,
      priority: data.priority || 'NORMAL',
      platforms: data.platforms,
      content: data.content,
      title: data.title,
      scheduledAt: data.scheduledAt,
      timezone: data.timezone || 'UTC',
      mediaUrls: data.mediaUrls,
      postType: data.postType,
      targetRegion: data.targetRegion,
      niche: data.niche,
      language: data.language,
      voiceId: data.voiceId,
      campaignSchedule: data.campaignSchedule,
      socialChannels: data.socialChannels,
      customPrompt: data.customPrompt,
      count: data.count,
      intervalHours: data.intervalHours,
      posts: data.posts,
      prompt: data.prompt,
      platformOptions: data.platformOptions,
      websiteUrl: data.websiteUrl,
      voicePrompt: data.voicePrompt,
      ingredientsToVideo: data.ingredientsToVideo,
      imageToVideo: data.imageToVideo,
      animateImageCount: data.animateImageCount,
      targetUserId: data.targetUserId,
      role: data.role,
      accountId: data.accountId,
      postId: data.postId,
      reelId: data.reelId,
      campaignId: data.campaignId,
      isActive: data.isActive,
      isRead: data.isRead,
      limit: data.limit,
      offset: data.offset,
      status: data.status,
      days: data.days,
      settings: data.settings,
      email: data.email,
      password: data.password,
      name: data.userName || data.name
    };

    const task = await hermesAgent.createTask(userId, taskPayload);

    res.status(201).json({
      success: true,
      task
    });
  } catch (error: any) {
    console.error('[POST /api/hermes/tasks] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create task' });
  }
});

/**
 * GET /api/hermes/tasks
 * List all Hermes tasks for the current user
 */
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const tasks = await hermesAgent.getTasks(userId, { status, limit, offset });

    res.json({
      success: true,
      tasks
    });
  } catch (error: any) {
    console.error('[GET /api/hermes/tasks] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch tasks' });
  }
});

/**
 * GET /api/hermes/tasks/:id
 * Get a specific Hermes task with executions
 */
router.get('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const task = await hermesAgent.getTask(id, userId);

    res.json({
      success: true,
      task
    });
  } catch (error: any) {
    console.error('[GET /api/hermes/tasks/:id] Error:', error);
    if (error.message === 'Task not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: error.message || 'Failed to fetch task' });
  }
});

/**
 * POST /api/hermes/tasks/:id/execute
 * Execute a Hermes task
 */
router.post('/tasks/:id/execute', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const result = await hermesAgent.executeTask(id, userId);

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[POST /api/hermes/tasks/:id/execute] Error:', error);
    res.status(400).json({ error: error.message || 'Failed to execute task' });
  }
});

/**
 * POST /api/hermes/tasks/:id/cancel
 * Cancel a pending Hermes task
 */
router.post('/tasks/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const task = await hermesAgent.cancelTask(id, userId);

    res.json({
      success: true,
      task
    });
  } catch (error: any) {
    console.error('[POST /api/hermes/tasks/:id/cancel] Error:', error);
    res.status(400).json({ error: error.message || 'Failed to cancel task' });
  }
});

/**
 * GET /api/hermes/tasks/:id/executions
 * Get execution history for a task
 */
router.get('/tasks/:id/executions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const executions = await hermesAgent.getExecutions(id, userId);

    res.json({
      success: true,
      executions
    });
  } catch (error: any) {
    console.error('[GET /api/hermes/tasks/:id/executions] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch executions' });
  }
});

/**
 * POST /api/hermes/execute
 * Quick execute an action without creating a persistent task
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { action, ...payload } = req.body;

    if (!action) {
      res.status(400).json({ error: 'Action is required' });
      return;
    }

    const task = await hermesAgent.createTask(userId, { action, ...payload });
    const result = await hermesAgent.executeTask(task.id, userId);

    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('[POST /api/hermes/execute] Error:', error);
    res.status(400).json({ error: error.message || 'Failed to execute action' });
  }
});

/**
 * GET /api/hermes/status
 * Get Hermes agent status and statistics
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await hermesAgent.getAgentStatus();

    res.json({
      success: true,
      ...status
    });
  } catch (error: any) {
    console.error('[GET /api/hermes/status] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get status' });
  }
});

/**
 * POST /api/hermes/quick-schedule
 * Quick schedule a post via Hermes
 */
router.post('/quick-schedule', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { content, platforms, scheduledAt, timezone, title, platformOptions } = req.body;

    if (!content || !platforms || platforms.length === 0) {
      res.status(400).json({ error: 'Content and platforms are required' });
      return;
    }

    const task = await hermesAgent.createTask(userId, {
      action: 'schedule_post',
      content,
      title,
      platforms,
      scheduledAt,
      timezone: timezone || 'UTC',
      platformOptions
    });

    const result = await hermesAgent.executeTask(task.id, userId);

    res.json({
      success: true,
      task,
      ...result
    });
  } catch (error: any) {
    console.error('[POST /api/hermes/quick-schedule] Error:', error);
    res.status(400).json({ error: error.message || 'Failed to quick schedule' });
  }
});

export const hermesRoutes = router;
