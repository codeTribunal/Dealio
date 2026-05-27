import { PrismaClient } from '@prisma/client';
import { encryptBotToken } from '../src/lib/crypto.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting bot token encryption migration...');

  const businesses = await prisma.business.findMany({
    where: {
      botToken: { not: null },
      botTokenEncrypted: null,
    },
    select: { id: true, name: true, botToken: true },
  });

  console.log(`Found ${businesses.length} businesses with unencrypted tokens`);

  for (const business of businesses) {
    if (!business.botToken) continue;

    const encrypted = encryptBotToken(business.botToken);

    await prisma.business.update({
      where: { id: business.id },
      data: {
        botTokenEncrypted: encrypted.encrypted,
        botTokenIv: encrypted.iv,
        botTokenTag: encrypted.tag,
      },
    });

    console.log(`Encrypted token for: ${business.name} (${business.id})`);
  }

  console.log('Migration complete.');
  console.log('IMPORTANT: Verify the app still works, then run the');
  console.log('remove-plain-tokens migration to delete botToken column.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
