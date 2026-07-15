import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const products = await prisma.automatedProduct.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, title: true, status: true, campaignId: true, createdAt: true }
  });
  console.log(JSON.stringify(products, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
