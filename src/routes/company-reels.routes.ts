import { Router } from 'express';
import { z } from 'zod';
import { jwtAuth as requireAuth } from '../middleware/jwt-auth.js';
import { prisma } from '../db/prisma.js';
import { CompanyKBService } from '../services/company-kb.service.js';
import { companyReelQueue } from '../queues/company-reel-queue.js';
import { companyReelScheduler } from '../workers/company-reel-scheduler.js';
import { logger } from '../logger/pino.js';

const router = Router();

// ─── Knowledge Base ────────────────────────────────────────────────────────────

const createKBSchema = z.object({
  companyName: z.string().min(1),
  industry: z.string().min(1),
  services: z.array(z.string()).min(1),
  targetAudience: z.string().min(1),
  painPoints: z.string().min(1),
  usps: z.array(z.string()).min(1),
  caseStudies: z.string().optional(),
  tone: z.string().default('Professional'),
  language: z.string().default('English'),
  voiceId: z.string().default('Puck'),
  socialChannels: z.array(z.string()).default([]),
  scheduleDays: z.array(z.string()).default([]),
  scheduleTime: z.string().optional(),
  timezoneOffset: z.number().optional(),
});

/**
 * POST /api/company-reels/knowledge-base
 * Create a new company knowledge base and trigger AI strategy analysis.
 */
router.post('/knowledge-base', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const data = createKBSchema.parse(req.body);

    const kb = await prisma.companyKnowledgeBase.create({
      data: {
        userId,
        companyName: data.companyName,
        industry: data.industry,
        services: JSON.stringify(data.services),
        targetAudience: data.targetAudience,
        painPoints: data.painPoints,
        usps: JSON.stringify(data.usps),
        caseStudies: data.caseStudies || null,
        tone: data.tone,
        language: data.language,
        voiceId: data.voiceId,
        socialChannels: JSON.stringify(data.socialChannels),
        scheduleDays: JSON.stringify(data.scheduleDays),
        scheduleTime: data.scheduleTime || null,
        timezoneOffset: data.timezoneOffset !== undefined ? data.timezoneOffset : null,
      }
    });

    // Trigger AI strategy analysis asynchronously (non-blocking)
    CompanyKBService.analyzeKnowledgeBase(kb.id).catch(err => {
      logger.error({ event: 'kb_strategy_analysis_failed', kbId: kb.id, error: err.message });
    });

    return res.status(201).json({ success: true, data: kb });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    logger.error({ event: 'create_kb_error', error: error.message });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/company-reels/knowledge-base
 * List all knowledge bases for the user.
 */
router.get('/knowledge-base', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const kbs = await prisma.companyKnowledgeBase.findMany({
      where: { userId },
      include: {
        _count: { select: { reels: true } },
        reels: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, status: true, topic: true, videoUrl: true, thumbnail: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: kbs });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/company-reels/knowledge-base/:id
 * Get a single knowledge base with all its reels.
 */
router.get('/knowledge-base/:id', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const kb = await prisma.companyKnowledgeBase.findUnique({
      where: { id, userId },
      include: {
        reels: {
          include: { post: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!kb) return res.status(404).json({ success: false, error: 'Knowledge base not found' });
    return res.json({ success: true, data: kb });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/company-reels/knowledge-base/:id/toggle
 * Toggle active status of a knowledge base.
 */
router.patch('/knowledge-base/:id/toggle', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const kb = await prisma.companyKnowledgeBase.findUnique({ where: { id, userId } });
    if (!kb) return res.status(404).json({ success: false, error: 'Knowledge base not found' });
    const updated = await prisma.companyKnowledgeBase.update({
      where: { id },
      data: { isActive: !kb.isActive }
    });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/company-reels/knowledge-base/:id/analyze
 * Re-trigger AI strategy analysis for an existing KB.
 */
router.post('/knowledge-base/:id/analyze', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const kb = await prisma.companyKnowledgeBase.findUnique({ where: { id, userId } });
    if (!kb) return res.status(404).json({ success: false, error: 'Knowledge base not found' });

    const strategy = await CompanyKBService.analyzeKnowledgeBase(id);
    return res.json({ success: true, data: { strategy } });
  } catch (error: any) {
    logger.error({ event: 'kb_analyze_error', error: error.message });
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/company-reels/knowledge-base/:id/generate
 * Manually trigger a reel generation for a KB right now.
 */
router.post('/knowledge-base/:id/generate', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const kb = await prisma.companyKnowledgeBase.findUnique({ where: { id, userId } });
    if (!kb) return res.status(404).json({ success: false, error: 'Knowledge base not found' });

    const companyReel = await companyReelScheduler.triggerReelGeneration(id, new Date());
    return res.json({ success: true, message: 'Reel generation started', data: companyReel });
  } catch (error: any) {
    logger.error({ event: 'kb_generate_error', error: error.message });
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/company-reels/knowledge-base/:id
 * Delete a knowledge base and all its reels.
 */
router.delete('/knowledge-base/:id', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    await prisma.companyKnowledgeBase.delete({ where: { id, userId } });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete knowledge base' });
  }
});

// ─── Company Reels ────────────────────────────────────────────────────────────

/**
 * GET /api/company-reels
 * List all company reels for the user.
 */
router.get('/', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const reels = await prisma.companyReel.findMany({
      where: { userId },
      include: { kb: { select: { companyName: true, industry: true } }, post: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: reels });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/company-reels/:id
 * Get a single company reel.
 */
router.get('/:id', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const reel = await prisma.companyReel.findUnique({
      where: { id, userId },
      include: { kb: true, post: true }
    });
    if (!reel) return res.status(404).json({ success: false, error: 'Reel not found' });
    return res.json({ success: true, data: reel });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
