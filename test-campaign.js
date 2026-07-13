import { prisma } from './dist/db/prisma.js';
import { aiOrchestrator } from './dist/services/ai-orchestrator.service.js';

async function test() {
  try {
    const campaign = await prisma.automatedCampaign.findFirst({
      include: {
        products: {
          where: { status: 'PENDING' },
          take: 1
        }
      }
    });
    if (!campaign) {
      console.log('No campaigns found');
      return;
    }
    const product = campaign.products[0];
    if (!product) {
      console.log('No pending products');
      return;
    }
    
    console.log('Processing product:', product.id);
    const aiPrompt = `Create a short viral TikTok/Reels promotional video script for this product: ${product.title}. Details: ${product.description}. Focus on high energy, hooks, and benefits.`;
          
    const scriptText = await aiOrchestrator.generateContent(aiPrompt, undefined, false);
    console.log('Success:', scriptText);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
