import { Request, Response, NextFunction } from 'express';
import { OAuthError } from '../errors/oauth.error.js';

// Extend Express Session type
declare module 'express-session' {
  interface SessionData {
    userId: string;
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    throw new OAuthError('Unauthorized', 'UNAUTHORIZED', 401);
  }

  // Attach userId to request for downstream use
  (req as any).userId = req.session.userId;
  next();
}
