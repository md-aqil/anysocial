import { Router, Request, Response } from 'express';
import { hermesAgent } from '../services/hermes-agent.service.js';
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

    // Use a fixed system user ID for external Hermes agent
    const SYSTEM_USER_ID = 'hermes-system';

    const task = await hermesAgent.createTask(SYSTEM_USER_ID, {
      action,
      ...payload
    });

    const result = await hermesAgent.executeTask(task.id, SYSTEM_USER_ID);

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
