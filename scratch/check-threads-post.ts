import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const post = await prisma.post.findUnique({
    where: { id: 'b9083fee-c814-443e-ae20-b9bc1bc319c5' }
  });
  console.log(JSON.stringify(post, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
