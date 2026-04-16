import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger/pino.js';
import { DecryptionError } from '../errors/decryption.error.js';
import { OAuthError } from '../errors/oauth.error.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({
    event: 'error',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path
  });

  if (err instanceof DecryptionError) {
    res.status(500).json({
      error: 'Internal server error'
    });
    return;
  }

  if (err instanceof OAuthError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code
    });
    return;
  }

  // Generic error
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
}
