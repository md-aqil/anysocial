import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("RECENT POSTS:");
  posts.forEach(p => {
    console.log(`- ID: ${p.id} | Status: ${p.status} | Media: ${p.mediaUrls.length} | Platforms: ${p.platforms.join(',')}`);
    console.log(`  Results: ${JSON.stringify(p.platformResults, null, 2)}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
