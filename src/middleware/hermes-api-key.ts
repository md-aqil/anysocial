import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';

export async function hermesApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-hermes-api-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    res.status(401).json({ error: 'Unauthorized: Missing Hermes API key' });
    return;
  }

  // Check system-wide Hermes API key first
  if (apiKey === env.HERMES_API_KEY) {
    next();
    return;
  }

  // Check if it's a user-specific Hermes API key
  try {
    const user = await prisma.user.findUnique({
      where: { hermesApiKey: apiKey },
      select: { id: true, email: true, role: true }
    });

    if (user) {
      (req as any).userId = user.id;
      (req as any).userEmail = user.email;
      next();
      return;
    }
  } catch (error) {
    console.error('[HERMES API KEY] Database error:', error);
  }

  res.status(401).json({ error: 'Unauthorized: Invalid Hermes API key' });
}
