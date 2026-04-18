import { Router } from 'express';
import { oauthRouter } from '../modules/oauth/oauth.router.js';
import { postRoutes } from './post.routes.js';
import { authRoutes } from './auth.routes.js';
import { analyticsRoutes } from './analytics.routes.js';
import { webhookRoutes } from './webhooks.routes.js';
import { configRoutes } from './config.routes.js';
import { adminHealthRoutes } from '../admin/health.routes.js';
import { adminAuditRoutes } from '../admin/audit.routes.js';
import { jwtAuth } from '../middleware/jwt-auth.js';
import { aiGenerationRoutes } from './ai-generation.routes.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Auth routes
router.use('/api/auth', authRoutes);

// OAuth routes
router.use('/oauth', oauthRouter);

// Post routes
router.use('/api/posts', postRoutes);

// Analytics routes (protected)
router.use('/api/analytics', jwtAuth, analyticsRoutes);

// Webhook routes (protected)
router.use('/api/webhooks', jwtAuth, webhookRoutes);

// Config routes
router.use('/api/config', configRoutes);

// Admin routes
router.use('/admin', adminHealthRoutes);
router.use('/admin/audit', adminAuditRoutes);

// AI Generation routes
router.use('/api/ai', aiGenerationRoutes);

export const routes = router;