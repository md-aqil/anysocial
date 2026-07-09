import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { adminAuth } from '../middleware/admin-auth.js';

const router = Router();

/**
 * GET /api/settings/ai-models
 * Fetch global AI model configurations.
 */
router.get('/ai-models', async (req: Request, res: Response) => {
  try {
    const setting = await prisma.appSetting.findUnique({
      where: { key: 'ai_models' }
    });
    
    // Default config if none exists
    const defaultConfig = {
      text: {
        primary: 'gemini-2.5-flash',
        secondary: 'gemini-1.5-pro',
        tertiary: 'gemini-2.5-pro'
      },
      image: {
        primary: 'gemini-2.5-flash-image',
        secondary: 'pollinations',
        tertiary: 'stock'
      },
      voice: {
        primary: 'google-cloud-standard',
        secondary: 'gemini-2.5-flash',
        tertiary: 'gemini-2.5-pro'
      }
    };

    res.json(setting ? setting.value : defaultConfig);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/settings/ai-models
 * Update global AI model configurations. (Admin Only)
 */
router.put('/ai-models', adminAuth, async (req: Request, res: Response) => {
  try {
    const config = req.body;
    
    const setting = await prisma.appSetting.upsert({
      where: { key: 'ai_models' },
      update: { value: config },
      create: { key: 'ai_models', value: config }
    });

    res.json({ message: 'Settings updated successfully', config: setting.value });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export const settingsRoutes = router;
