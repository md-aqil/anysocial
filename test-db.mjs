import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const latestReel = await prisma.reel.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  console.log("Status:", latestReel.status);
  console.log("Status Message:", latestReel.statusMessage);
}
check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
