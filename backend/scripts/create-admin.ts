import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@uzbekcrm.uz';
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? 'Super Admin';

  if (!password) {
    throw new Error('Set ADMIN_PASSWORD environment variable');
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });

  if (existing) {
    console.log(`Admin user ${email} already exists (id: ${existing.id})`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.adminUser.create({
    data: { email, name, passwordHash, role: 'SUPER_ADMIN' },
  });

  console.log(`Created SUPER_ADMIN: ${admin.email} (${admin.id})`);
  console.log('IMPORTANT: Change your password after first login');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
