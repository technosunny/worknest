import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create super admin
  const passwordHash = await bcrypt.hash('HR360Flow@2026', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@hr360flow.com' },
    update: {},
    create: {
      email: 'admin@hr360flow.com',
      password_hash: passwordHash,
      role: UserRole.super_admin,
      first_name: 'Super',
      last_name: 'Admin',
      status: UserStatus.active,
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
