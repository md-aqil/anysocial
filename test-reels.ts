import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const reels = await prisma.reel.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, createdAt: true, status: true, postId: true }
  });
  console.log("Latest created reels:");
  console.log(JSON.stringify(reels, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
