import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto';

if (!process.env.BOT_TOKEN_ENCRYPTION_KEY) {
  throw new Error('BOT_TOKEN_ENCRYPTION_KEY is not set');
}

const ENCRYPTION_KEY = Buffer.from(
  process.env.BOT_TOKEN_ENCRYPTION_KEY,
  'hex',
);

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error(
    'BOT_TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)',
  );
}

export interface EncryptedToken {
  encrypted: string;
  iv: string;
  tag: string;
}

export function encryptBotToken(plaintext: string): EncryptedToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
  };
}

export function decryptBotToken(token: EncryptedToken): string {
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      ENCRYPTION_KEY,
      Buffer.from(token.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(token.tag, 'hex'));

    return Buffer.concat([
      decipher.update(Buffer.from(token.encrypted, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error(
      'Failed to decrypt bot token — invalid key or corrupted data',
    );
  }
}

export function isEncryptedToken(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return (
      typeof parsed.encrypted === 'string' &&
      typeof parsed.iv === 'string' &&
      typeof parsed.tag === 'string'
    );
  } catch {
    return false;
  }
}

// timingSafeEqual is imported for future use in constant-time comparisons
void timingSafeEqual;
