import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import { jwtAuth } from '../middleware/jwt-auth.js';
import { prisma } from '../db/prisma.js';

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
    const model = req.body.model;
    // @ts-ignore
    const mediaFile = req.file;
    const text = await aiOrchestrator.chatContent(messages, mediaFile, model);
    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/improve-prompt
 * Rewrites a user prompt using AI to make it better suited for the chosen generation type.
 */
router.post('/improve-prompt', jwtAuth, async (req: Request, res: Response) => {
  try {
    const { prompt, type } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    let systemPrompt = "";
    if (type === 'image') {
      systemPrompt = "You are an expert AI image prompt engineer. Rewrite the following user request into a highly detailed, descriptive, and visually striking prompt optimized for image generation models (like Midjourney or Gemini). Focus on lighting, art style, composition, colors, and camera angles. DO NOT add any conversational text like 'Here is your prompt'. Return ONLY the prompt text.";
    } else if (type === 'voice') {
      systemPrompt = "You are a professional voiceover scriptwriter. Rewrite the following user request into a highly engaging, natural-sounding, and punchy script meant to be read aloud by a voice actor. Spell out all numbers and symbols. DO NOT add conversational text or stage directions. Return ONLY the spoken text.";
    } else {
      systemPrompt = "You are a professional prompt engineer. Rewrite the following user request into a much clearer, more structured, and highly detailed prompt for a Large Language Model. DO NOT add conversational text. Return ONLY the improved prompt text.";
    }

    // Use generateContent directly with the system instruction included in the user prompt since chatContent adds social media system prompt
    const enhancedPrompt = await aiOrchestrator.generateContent(`${systemPrompt}\n\nUser request to improve:\n${prompt}`);
    
    res.json({ text: enhancedPrompt.trim() });
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
    
    // generateImage is LLM-only and intentionally has no stock fallback.
    const tempImagePath = await aiOrchestrator.generateImage(prompt, 0);
    
    // Move to public uploads folder
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
    
    // Save to history
    const userId = (req as any).userId;
    if (userId) {
      await prisma.playgroundImage.create({
        data: {
          userId,
          prompt,
          imageUrl
        }
      });
    }
    
    res.json({ url: imageUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/playground-history
 * Fetch image playground history for the authenticated user.
 */
router.get('/playground-history', jwtAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const history = await prisma.playgroundImage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/generate-voice
 * Generates a voiceover using the configured AI model (Gemini or Google TTS).
 */
router.post('/generate-voice', jwtAuth, async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Aoede', language = 'en-US', useAdvancedModel = true, model } = req.body;
    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }
    
    const { audioPath: tempAudioPath } = await aiOrchestrator.generateVoiceover(text, voiceName, language, useAdvancedModel, true, model);
    
    // Move to public uploads folder
    const publicDir = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'ai-audio');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const publicFilename = `ai_audio_${Date.now()}.wav`;
    const publicFilePath = path.join(publicDir, publicFilename);
    
    fs.copyFileSync(tempAudioPath, publicFilePath);
    
    try {
      fs.unlinkSync(tempAudioPath);
    } catch (e) {}
    
    const audioUrl = `/uploads/ai-audio/${publicFilename}`;
    res.json({ url: audioUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const aiGenerationRoutes = router;
