import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { jwtAuth } from '../middleware/jwt-auth.js';
import crypto from 'crypto';

const router = Router();

router.use(jwtAuth);

/**
 * GET /api/hermes/connection
 * Get current user's Hermes connection status and key
 */
router.get('/connection', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        hermesApiKey: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const hasKey = !!user.hermesApiKey;
    const maskedKey = user.hermesApiKey 
      ? `${user.hermesApiKey.substring(0, 8)}...${user.hermesApiKey.substring(user.hermesApiKey.length - 4)}`
      : null;

    res.json({
      success: true,
      connected: hasKey,
      maskedKey,
      apiKey: user.hermesApiKey // Only shown once on generation
    });
  } catch (error: any) {
    console.error('[HERMES CONNECTION] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get connection status' });
  }
});

/**
 * POST /api/hermes/connection/generate
 * Generate a new Hermes API key for the current user
 */
router.post('/connection/generate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Generate a secure random key
    const apiKey = `hermes_${crypto.randomBytes(32).toString('hex')}`;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { hermesApiKey: apiKey },
      select: {
        id: true,
        email: true,
        name: true,
        hermesApiKey: true
      }
    });

    res.json({
      success: true,
      message: 'Hermes API key generated successfully',
      apiKey: user.hermesApiKey,
      connectionUrl: `${process.env.BASE_URL}/api/hermes-external/execute`
    });
  } catch (error: any) {
    console.error('[HERMES CONNECTION] Generate error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate API key' });
  }
});

/**
 * POST /api/hermes/connection/revoke
 * Revoke the current user's Hermes API key
 */
router.post('/connection/revoke', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    await prisma.user.update({
      where: { id: userId },
      data: { hermesApiKey: null }
    });

    res.json({
      success: true,
      message: 'Hermes API key revoked successfully'
    });
  } catch (error: any) {
    console.error('[HERMES CONNECTION] Revoke error:', error);
    res.status(500).json({ error: error.message || 'Failed to revoke API key' });
  }
});

export const hermesConnectionRoutes = router;
