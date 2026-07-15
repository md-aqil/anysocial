import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const posts = await prisma.post.findMany({
    select: { id: true, createdAt: true, scheduledAt: true, status: true }
  });
  const jul13 = posts.filter(p => 
    (p.scheduledAt && p.scheduledAt.toISOString().includes('07-13')) || 
    (p.createdAt && p.createdAt.toISOString().includes('07-13'))
  );
  console.log(`Found ${jul13.length} posts related to July 13`);
  console.log(JSON.stringify(jul13, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
