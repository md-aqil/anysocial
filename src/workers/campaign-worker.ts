import cron from 'node-cron';
import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import { reelGenerationQueue } from '../queues/reel-queue.js';

export const campaignWorker = {
  start() {
    logger.info('Starting Automated Campaign Worker...');
    
    // Run every hour to check active campaigns
    cron.schedule('0 * * * *', async () => {
      logger.info('Running Campaign Worker Schedule');
      await this.processCampaigns();
    });
  },

  async processCampaigns() {
    try {
      const activeCampaigns = await prisma.automatedCampaign.findMany({
        where: { isActive: true },
        include: {
          products: {
            where: { status: 'PENDING' },
            take: 1 // Process one product at a time per campaign run
          }
        }
      });

      for (const campaign of activeCampaigns) {
        await this.processSingleCampaign(campaign.id);
      }
    } catch (error: any) {
      logger.error(`Campaign Worker Error: ${error.message}`);
    }
  },

  async processSingleCampaign(campaignId: string) {
    try {
      const campaign = await prisma.automatedCampaign.findUnique({
        where: { id: campaignId },
        include: {
          products: {
            where: { status: 'PENDING' },
            take: 1
          }
        }
      });

      if (!campaign || campaign.products.length === 0) {
        logger.info(`No pending products found for campaign ${campaignId}`);
        return null; // Return null if nothing to process
      }

      const product = campaign.products[0];
      
      try {
        logger.info(`Processing product ${product.id} for campaign ${campaign.id}`);
        
        await prisma.automatedProduct.update({
          where: { id: product.id },
          data: { status: 'PROCESSING' }
        });

        // We don't generate the script here to avoid blocking the API request.
        // Instead, we pass the prompt as the scriptText (or null) to the background queue, 
        // which handles the script generation, TTS, and image generation.
        const aiPrompt = `Create a short viral TikTok/Reels promotional video script for this product: ${product.title}. Details: ${product.description}. Focus on high energy, hooks, and benefits.`;
        
        let scriptText = '';
        try {
          // Attempt to generate script inline so it's ready, but don't fail if billing is down
          scriptText = await aiOrchestrator.generateContent(aiPrompt, undefined, false);
        } catch (e: any) {
          logger.warn(`Failed to generate script inline for product ${product.id}, falling back. Error: ${e.message}`);
          scriptText = aiPrompt; // fallback to prompt
        }

        const reel = await prisma.reel.create({
          data: {
            userId: campaign.userId,
            type: 'PRODUCT',
            script: scriptText,
            status: 'PENDING',
            socialChannels: campaign.socialChannels,
            metadata: {
              campaignId: campaign.id,
              productTitle: product.title,
              productUrl: product.productUrl
            },
            scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000)
          }
        });

        if (product.imageUrl) {
          await prisma.productReelAsset.create({
            data: {
              reelId: reel.id,
              url: product.imageUrl,
              type: 'IMAGE'
            }
          });
        }

        await prisma.automatedProduct.update({
          where: { id: product.id },
          data: { 
            status: 'COMPLETED',
            reelId: reel.id
          }
        });
        
        // Push to background queue for full rendering (voiceover, images, video)
        await reelGenerationQueue.add("generate-reel", {
          reelId: reel.id,
          enableMusic: true,
          enableVoice: true,
          scriptText: scriptText,
          language: campaign.language,
          voiceId: campaign.voiceId,
        });

        logger.info(`Successfully queued Reel ${reel.id} for product ${product.id}`);
        return reel;
      } catch (err: any) {
        logger.error(`Failed to process product ${product.id}: ${err.message}`);
        await prisma.automatedProduct.update({
          where: { id: product.id },
          data: { status: 'FAILED' }
        });
        throw err;
      }
    } catch (error: any) {
      logger.error(`processSingleCampaign Error: ${error.message}`);
      throw error;
    }
  }
};
