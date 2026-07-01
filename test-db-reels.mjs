import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const reels = await prisma.reel.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log("ALL REELS:", JSON.stringify(reels, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
