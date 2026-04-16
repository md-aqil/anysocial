import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.socialAccount.findMany({
    select: {
      id: true,
      platform: true,
      status: true,
      externalAccountId: true,
      userId: true,
      metadata: true
    }
  });
  console.log('--- Social Accounts in DB ---');
  console.log(JSON.stringify(accounts, null, 2));
  
  const users = await prisma.user.findMany({
    select: { id: true, email: true }
  });
  console.log('\n--- Users ---');
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
