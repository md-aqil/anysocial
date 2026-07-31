import { Router } from 'express';
import { oauthRouter } from '../modules/oauth/oauth.router.js';
import { postRoutes } from './post.routes.js';
import { authRoutes } from './auth.routes.js';
import { analyticsRoutes } from './analytics.routes.js';
import { webhookRoutes } from './webhooks.routes.js';
import { configRoutes } from './config.routes.js';
import { adminHealthRoutes } from '../admin/health.routes.js';
import { adminAuditRoutes } from '../admin/audit.routes.js';
import { adminRoutes } from '../admin/admin.routes.js';

import { jwtAuth } from '../middleware/jwt-auth.js';
import { aiGenerationRoutes } from './ai-generation.routes.js';
import { reelsRoutes } from './reels.routes.js';
import { curationRoutes } from './curation.routes.js';
import adCreatorRoutes from './ad-creator.routes.js';
import scrapeRoutes from './scrape.routes.js';
import { settingsRoutes } from './settings.routes.js';
import veoRoutes from './veo.routes.js';
import automationRoutes from './automation.routes.js';
import companyReelsRoutes from './company-reels.routes.js';
import publicVeoRoutes from './public-veo.routes.js';

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
router.use('/api/admin', adminRoutes);

// AI Generation routes
router.use('/api/ai', aiGenerationRoutes);

// Reels Creator routes
router.use('/api/reels', jwtAuth, reelsRoutes);

// Public route for landing page reels
import fs from 'fs';
import path from 'path';

router.get('/api/public/reels', async (req, res) => {
  try {
    const uploadDir = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'landing-reel');
    if (!fs.existsSync(uploadDir)) {
      return res.json({ success: true, data: [] });
    }
    const files = fs.readdirSync(uploadDir);
    const videoFiles = files.filter(f => f.endsWith('.mp4') && !f.startsWith('thumb_'));
    
    const productReels = videoFiles.map(f => {
      const thumb = files.find(t => t === `thumb_${f}`);
      return {
        id: f,
        videoUrl: `/uploads/landing-reel/${f}`,
        thumbnailUrl: thumb ? `/uploads/landing-reel/${thumb}` : undefined
      };
    });
    
    return res.json({ success: true, data: productReels });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch' });
  }
});

// Curation routes
router.use('/api/curation', curationRoutes);

// Ad Creator routes
router.use('/api/ad-creator', jwtAuth, adCreatorRoutes);

// Scrape routes
router.use('/api/scrape', scrapeRoutes);

// Settings routes
router.use('/api/settings', settingsRoutes);
router.use('/api/veo', jwtAuth, veoRoutes);

// Automation routes
router.use('/api/automation', automationRoutes);

// Company Reels routes (B2B)
router.use('/api/company-reels', jwtAuth, companyReelsRoutes);

// Public API for other projects to trigger Veo generations securely
router.use('/api/public/veo', publicVeoRoutes);

export const routes = router;