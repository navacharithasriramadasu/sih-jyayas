import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Enabling Postgres Extensions...');
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS cube;`);
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS earthdistance;`);
  console.log('Extensions Enabled Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
