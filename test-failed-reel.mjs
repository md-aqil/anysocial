import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const failedReels = await prisma.reel.findMany({
  where: { status: 'FAILED' },
  orderBy: { createdAt: 'desc' },
  take: 1
});
console.log("Failed Reel ID:", failedReels[0]?.id);
console.log("Status Message:", failedReels[0]?.statusMessage);
console.log("Raw Script:", JSON.stringify(failedReels[0]?.script, null, 2));
