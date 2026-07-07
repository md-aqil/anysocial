
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

/**
 * POST /api/ai/adapt-content
 * Adapts content for a specific platform.
 */
router.post('/adapt-content', jwtAuth, async (req: Request, res: Response) => {
  try {
    const { content, platform } = req.body;
    const result = await aiOrchestrator.adaptContent(content, platform);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/chat
 * Conversational AI endpoint for post writing.
 */
router.post('/chat', jwtAuth, upload.single('media'), async (req: Request, res: Response) => {
  try {
    const messages = JSON.parse(req.body.messages || '[]');
    // @ts-ignore
    const mediaFile = req.file;
    const text = await aiOrchestrator.chatContent(messages, mediaFile);
    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/generate-image
 * Generates an image using the configured AI model (Gemini).
 */
router.post('/generate-image', jwtAuth, async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }
    
    // Call generateImage without allowing fallbacks so we strictly test the AI
    const tempImagePath = await aiOrchestrator.generateImage(prompt, 0, false);
    
    // Move to public uploads folder
    const fs = require('fs');
    const path = require('path');
    const publicDir = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'ai-images');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const publicFilename = `ai_image_${Date.now()}.jpg`;
    const publicFilePath = path.join(publicDir, publicFilename);
    
    fs.copyFileSync(tempImagePath, publicFilePath);
    
    // Try to cleanup the temp file
    try {
      fs.unlinkSync(tempImagePath);
    } catch (e) {
      // ignore
    }
    
    const imageUrl = `/uploads/ai-images/${publicFilename}`;
    res.json({ url: imageUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const aiGenerationRoutes = router;
