import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("POSTS:", JSON.stringify(posts, null, 2));
  
  const reels = await prisma.reel.findMany({
    where: { postId: { not: null } },
    take: 5
  });
  console.log("REELS:", JSON.stringify(reels, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
