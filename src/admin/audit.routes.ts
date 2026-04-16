import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';

const router = Router();

router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { action, resourceType, userId, startDate, endDate, limit } = req.query;

    const where: any = {};

    if (action) where.action = action as string;
    if (resourceType) where.resourceType = resourceType as string;
    if (userId) where.actorUserId = userId as string;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const logs = await prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string) || 50,
    });

    res.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch audit logs';
    res.status(500).json({ error: message });
  }
});

export const adminAuditRoutes = router;