// Production seed script (compiled JS, no ts-node needed)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  const passwordHash = await bcrypt.hash('WorkNest@2026', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@worknest.in' },
    update: {},
    create: {
      email: 'admin@worknest.in',
      password_hash: passwordHash,
      role: 'super_admin',
      first_name: 'Super',
      last_name: 'Admin',
      status: 'active',
      org_id: null,
    },
  });

  console.log('Super admin created:', superAdmin.email);
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
