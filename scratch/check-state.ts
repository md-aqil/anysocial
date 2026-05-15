import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkState() {
  const state = await prisma.oAuthState.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(state, null, 2));
  process.exit(0);
}

checkState();
