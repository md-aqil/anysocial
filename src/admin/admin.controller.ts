import { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';

export class AdminController {
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          socialAccounts: {
            select: {
              id: true,
              platform: true,
              status: true,
              externalAccountId: true
            }
          },
          _count: {
            select: {
              posts: true,
              socialAccounts: true
            }
          }
        }
      });

      res.json({ users });
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export const adminController = new AdminController();
