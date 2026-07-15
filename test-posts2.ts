import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, createdAt: true, scheduledAt: true, status: true }
  });
  console.log("Latest created posts:");
  console.log(JSON.stringify(posts, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
