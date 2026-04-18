import { Router, Request, Response } from 'express';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import { jwtAuth } from '../middleware/jwt-auth.js';

const router = Router();

/**
 * POST /api/ai/propose-directions
 * Takes product info, returns 5 creative directions.
 */
router.post('/propose-directions', jwtAuth, async (req: Request, res: Response) => {
  try {
    const directions = await aiOrchestrator.proposeDirections(req.body);
    res.json({ directions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/generate-brief
 * Takes selected direction and product info, returns a full ad brief.
 */
router.post('/generate-brief', jwtAuth, async (req: Request, res: Response) => {
  try {
    const { directionId, productDetails } = req.body;
    const brief = await aiOrchestrator.generateBrief(directionId, productDetails);
    res.json({ brief });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/generate-assets
 * Triggers the actual image generation via Kie.ai.
 */
router.post('/generate-assets', jwtAuth, async (req: Request, res: Response) => {
  try {
    const { brief, productDetails } = req.body;
    const task = await aiOrchestrator.generateImage({ brief, productDetails });
    res.json({ taskId: task.data.taskId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/status/:taskId
 * Polls for completion and stages the final asset.
 */
router.get('/status/:taskId', jwtAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { taskId } = req.params;
    const asset = await aiOrchestrator.pollAndStageAsset(taskId, userId);
    res.json({ status: 'completed', asset });
  } catch (error: any) {
    if (error.message.includes('Timed out')) {
      res.json({ status: 'processing' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

export const aiGenerationRoutes = router;
