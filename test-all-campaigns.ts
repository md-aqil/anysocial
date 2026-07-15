import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const campaigns = await prisma.automatedCampaign.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, ingredientsToVideo: true, createdAt: true, websiteUrl: true }
  });
  console.log(JSON.stringify(campaigns, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
