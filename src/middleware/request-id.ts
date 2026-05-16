import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const headerId = (req.headers['x-request-id'] as string) || '';
  const id = headerId || uuidv4();
  (req as any).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

export default requestId;
