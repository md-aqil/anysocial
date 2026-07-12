const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stuck = await prisma.reel.updateMany({
    where: { 
      type: 'VEO_SHORT',
      status: { in: ['PENDING', 'GENERATING'] }
    },
    data: {
      status: 'FAILED',
      statusMessage: 'Generation timed out or worker crashed.'
    }
  });
  console.log(`Updated ${stuck.count} stuck reels to FAILED.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
