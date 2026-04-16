import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import fs from 'fs';
import path from 'path';

function logToFile(message: string) {
  const logPath = path.join(process.cwd(), 'scratch', 'backend-debug.log');
  const timestamp = new Date().toISOString();
  if (!fs.existsSync(path.dirname(logPath))) {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
  }
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

export function jwtAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logToFile(`JWT AUTH FAIL: No token for ${req.method} ${req.url}`);
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.slice(7);
  
  try {
    const payload = AuthService.verifyToken(token);
    (req as any).userId = payload.userId;
    (req as any).userEmail = payload.email;
    next();
  } catch (error) {
    logToFile(`JWT AUTH FAIL: Invalid token for ${req.method} ${req.url}`);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}