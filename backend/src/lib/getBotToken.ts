import { decryptBotToken } from './crypto.js';

interface BusinessWithToken {
  id: string;
  botTokenEncrypted: string | null;
  botTokenIv: string | null;
  botTokenTag: string | null;
}

export function getBotToken(business: BusinessWithToken): string {
  if (
    business.botTokenEncrypted &&
    business.botTokenIv &&
    business.botTokenTag
  ) {
    return decryptBotToken({
      encrypted: business.botTokenEncrypted,
      iv: business.botTokenIv,
      tag: business.botTokenTag,
    });
  }
  throw new Error(`No bot token found for business ${business.id}`);
}

export function hasBotToken(business: BusinessWithToken): boolean {
  return !!(
    business.botTokenEncrypted &&
    business.botTokenIv &&
    business.botTokenTag
  );
}
