import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { hermesAgent } from '../services/hermes-agent.service.js';
import { prisma } from '../db/prisma.js';
import { z } from 'zod';
import { hermesApiKey } from '../middleware/hermes-api-key.js';

const router = Router();

const executeSchema = z.object({
  action: z.string().min(1),
  payload: z.record(z.any()).optional()
});

router.use(hermesApiKey);

/**
 * POST /api/hermes-external/execute
 * Execute any Hermes action with API key auth
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { action, payload = {} } = executeSchema.parse(req.body);

    // Run external tasks as the user who owns this API key so that account-
    // scoped actions (list accounts, schedule, etc.) operate on their data.
    // The global system key has no owner, so fall back to a seeded system user.
    const apiKey = (req.headers['x-hermes-api-key'] as string | undefined)?.trim();
    const owner = apiKey
      ? await prisma.user.findUnique({ where: { hermesApiKey: apiKey }, select: { id: true } })
      : null;

    let systemUserId: string;
    if (owner) {
      systemUserId = owner.id;
    } else {
      await prisma.user.upsert({
        where: { id: 'hermes-system' },
        update: {},
        create: {
          id: 'hermes-system',
          email: 'hermes-system@local',
          passwordHash: crypto.randomBytes(32).toString('hex'),
          name: 'Hermes System',
          role: 'system',
        },
      });
      systemUserId = 'hermes-system';
    }

    const task = await hermesAgent.createTask(systemUserId, {
      action,
      ...payload
    });

    const result = await hermesAgent.executeTask(task.id, systemUserId);

    res.json({
      success: true,
      action,
      taskId: task.id,
      result: result.result,
      duration: result.duration
    });
  } catch (error: any) {
    console.error('[HERMES EXTERNAL] Error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to execute action'
    });
  }
});

/**
 * GET /api/hermes-external/status
 * Get Hermes agent status
 */
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await hermesAgent.getAgentStatus();
    res.json({ success: true, ...status });
  } catch (error: any) {
    console.error('[HERMES EXTERNAL] Status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get status' });
  }
});

export const hermesExternalRoutes = router;
