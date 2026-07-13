import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const reel = await prisma.reel.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(reel, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
