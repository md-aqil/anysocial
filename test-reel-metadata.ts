import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const reel = await prisma.reel.findUnique({
    where: { id: '533962b2-7ced-4287-af9a-e6b18774a81c' }
  });
  console.log(JSON.stringify(reel?.metadata, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
