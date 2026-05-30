import { Request, Response, NextFunction } from 'express';
import { jwtAuth } from './jwt-auth.js';
import { prisma } from '../db/prisma.js';

export const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  // First run the standard JWT auth
  jwtAuth(req, res, async () => {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

      next();
    } catch (error) {
      console.error('Admin Auth Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
};
