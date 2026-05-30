import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.socialAccount.deleteMany({
    where: { status: 'REVOKED' }
  });
  console.log(`Deleted ${result.count} revoked accounts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
