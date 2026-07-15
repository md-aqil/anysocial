import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const count = await prisma.reel.count();
  const latest = await prisma.reel.findFirst({ orderBy: { createdAt: 'desc' } });
  console.log("Total reels:", count);
  console.log("Latest reel:", latest);
}
run().catch(console.error).finally(() => prisma.$disconnect());
