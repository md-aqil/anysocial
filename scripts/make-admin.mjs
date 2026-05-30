import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'aqilali381@gmail.com';
  console.log(`Checking user: ${email}...`);
  
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    console.log(`User ${email} not found. Cannot make super admin.`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: { role: 'super_admin' }
  });

  console.log(`Successfully made ${email} a super_admin!`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
