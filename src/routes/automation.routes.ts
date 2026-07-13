import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { jwtAuth as requireAuth } from '../middleware/jwt-auth.js';
import { automationScraperService } from '../services/automation-scraper.service.js';
import { logger } from '../logger/pino.js';
import { campaignWorker } from '../workers/campaign-worker.js';

const router = Router();

// Create a new automated campaign
router.post('/campaigns', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { websiteUrl, schedule, socialChannels, language, voiceId, ingredientsToVideo, animateImageCount, voicePrompt } = req.body;

    if (!websiteUrl || !schedule) {
      return res.status(400).json({ error: 'Website URL and Schedule are required' });
    }

    const campaign = await prisma.automatedCampaign.create({
      data: {
        userId,
        websiteUrl,
        schedule,
        socialChannels: JSON.stringify(socialChannels || []),
        language: language || 'English',
        voiceId: voiceId || 'Aoede',
        ingredientsToVideo: ingredientsToVideo === true,
        animateImageCount: animateImageCount ? Math.min(Math.max(1, Number(animateImageCount)), 3) : 3,
        voicePrompt: voicePrompt || null,
      },
    });

    // Trigger initial scraping in the background
    automationScraperService.discoverProducts(campaign.id, websiteUrl).catch((err) => {
      logger.error(`Initial scrape failed for campaign ${campaign.id}: ${err.message}`);
    });

    return res.status(201).json(campaign);
  } catch (error: any) {
    logger.error(`Error creating automated campaign: ${error.message}`);
    return res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Get all campaigns for the user
router.get('/campaigns', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const campaigns = await prisma.automatedCampaign.findMany({
      where: { userId },
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(campaigns);
  } catch (error: any) {
    logger.error(`Error fetching campaigns: ${error.message}`);
    return res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Toggle campaign status
router.put('/campaigns/:id/toggle', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { isActive } = req.body;

    const campaign = await prisma.automatedCampaign.update({
      where: { id, userId },
      data: { isActive }
    });

    return res.json(campaign);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to toggle campaign status' });
  }
});

// Generate a reel now for a campaign
router.post('/campaigns/:id/generate', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const campaign = await prisma.automatedCampaign.findUnique({
      where: { id, userId }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const reel = await campaignWorker.processSingleCampaign(id);
    if (!reel) {
      return res.status(400).json({ error: 'No pending products found to generate a reel for.' });
    }

    return res.json({ message: 'Reel generation started', reel });
  } catch (error: any) {
    logger.error(`Error generating reel for campaign: ${error.message}`);
    return res.status(500).json({ error: 'Failed to generate reel for campaign' });
  }
});

// Delete campaign
router.delete('/campaigns/:id', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    await prisma.automatedCampaign.delete({
      where: { id, userId }
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
