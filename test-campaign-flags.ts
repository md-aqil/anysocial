import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const campaign = await prisma.automatedCampaign.findUnique({
    where: { id: '5eb9a034-445d-44cb-a448-755dbb264e54' }
  });
  console.log(JSON.stringify(campaign, null, 2));
}
run().catch(console.error).finally(() => prisma.$disconnect());
