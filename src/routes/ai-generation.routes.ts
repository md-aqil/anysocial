
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import { jwtAuth } from '../middleware/jwt-auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/ai/analyze-media
 * Analyzes media and generates content.
 */
router.post('/analyze-media', jwtAuth, upload.single('media'), async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const mediaFile = req.file;
    const result = await aiOrchestrator.analyzeMedia(mediaFile);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const aiGenerationRoutes = router;
