import 'dotenv/config';
import path from 'path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { createClient } from 'redis';
import RedisStore from 'connect-redis';
import { pinoHttp } from 'pino-http';

import { logger } from './logger/pino.js';
import { requestId } from './middleware/request-id.js';
import { routes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { hermesExternalRoutes } from './routes/hermes-external.routes.js';
import { refreshScheduler } from './modules/tokens/refresh.scheduler.js';
import { postWorker } from './workers/post-worker.js';
import { seriesReelWorker } from './workers/series-reel-worker.js';
import { veoWorker } from './workers/veo-worker.js';
import { campaignWorker } from './workers/campaign-worker.js';
import { companyReelWorker } from './workers/company-reel-worker.js';
import { companyReelScheduler } from './workers/company-reel-scheduler.js';
import { autonomousWorker } from './workers/autonomous-content-worker.js';
import { env } from './config/env.js';

// Initialize Redis client for session store
const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.connect().catch(console.error);

const app = express();
const PORT = env.PORT;

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Static files (Uploads) — served with explicit video/mp4 Content-Type for Meta bot compliance
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'frontend', 'public', 'uploads'), {
    setHeaders: (res, filePath) => {
      if (/\.(mp4|mov|webm)$/i.test(filePath)) {
        res.setHeader('Content-Type', 'video/mp4');
      }
    }
  })
);

// CORS — restrict to an explicit allowlist (never reflect arbitrary origins with credentials)
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim()).filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173', 'https://socialsched.vibeship.in'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin / server-to-server / curl (no Origin header)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true
  })
);

// Body parsing (uploads use multer/multipart, so JSON/urlencoded can stay modest)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Cookie parser
app.use(cookieParser());

// Session management
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Attach a request id early for correlation in logs and responses
app.use(requestId);

// HTTP request logging with Pino
app.use(
  pinoHttp({
    logger,
    redact: {
      paths: ['req.headers.authorization'],
      censor: '[REDACTED]'
    }
  })
);

// Rate limiting
app.use(rateLimiter);

// Routes
app.use(routes);
app.use('/api/hermes-external', hermesExternalRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info({
    event: 'server_started',
    port: PORT,
    environment: env.NODE_ENV
  });

  // Start refresh scheduler and workers
  postWorker.start().catch(console.error);
  seriesReelWorker.start().catch(console.error);
  veoWorker.start().catch(console.error);
  campaignWorker.start();
  companyReelWorker.start().catch(console.error);
  companyReelScheduler.start();
  // Start autonomous agent worker
  autonomousWorker.start('system');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info({ event: 'sigterm_received' });
  refreshScheduler.stop();
  await postWorker.shutdown();
  await seriesReelWorker.shutdown();
  await veoWorker.shutdown();
  await companyReelWorker.shutdown();
  await autonomousWorker.stop('system');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info({ event: 'sigint_received' });
  refreshScheduler.stop();
  await postWorker.shutdown();
  await seriesReelWorker.shutdown();
  await veoWorker.shutdown();
  await companyReelWorker.shutdown();
  await autonomousWorker.stop('system');
  process.exit(0);
});

export default app;
