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
import { routes } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limiter.js';
import { refreshScheduler } from './modules/tokens/refresh.scheduler.js';
import { postWorker } from './workers/post-worker.js';
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

// CORS
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  refreshScheduler.start();
  postWorker.start().catch(console.error);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info({ event: 'sigterm_received' });
  refreshScheduler.stop();
  await postWorker.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info({ event: 'sigint_received' });
  refreshScheduler.stop();
  await postWorker.shutdown();
  process.exit(0);
});

export default app;
