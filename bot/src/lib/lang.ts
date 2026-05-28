import { InlineKeyboard } from 'grammy';
import { MyContext } from './types.js';
import { getCustomerLanguage } from './api.js';
import { Lang, resolveLang } from './i18n.js';

/**
 * Resolve the language to use for the current chat's customer.
 * Uses the session cache first, then looks up the stored languagePreference
 * (falling back to the business language). Defaults to UZBEK on any failure.
 */
export async function getLang(ctx: MyContext): Promise<Lang> {
  if (ctx.session.lang) return ctx.session.lang;
  const tgId = String(ctx.from?.id ?? '');
  if (!tgId) return 'UZBEK';
  try {
    const info = await getCustomerLanguage(ctx.botUsername, tgId);
    const lang = resolveLang(info.languagePreference, info.businessLanguage);
    // Only cache once the customer has actually chosen — otherwise keep
    // re-checking so the picker can fire until a choice is made.
    if (info.languagePreference) ctx.session.lang = lang;
    return lang;
  } catch {
    return 'UZBEK';
  }
}

/** True when the customer has not yet picked a language. */
export async function needsLanguagePicker(ctx: MyContext): Promise<boolean> {
  if (ctx.session.lang) return false;
  const tgId = String(ctx.from?.id ?? '');
  if (!tgId) return false;
  try {
    const info = await getCustomerLanguage(ctx.botUsername, tgId);
    if (info.languagePreference) {
      ctx.session.lang = resolveLang(info.languagePreference, info.businessLanguage);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** The trilingual language picker keyboard. */
export function languageKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🇺🇿 O'zbek", 'setlang:UZBEK')
    .text('🇷🇺 Русский', 'setlang:RUSSIAN')
    .text('🇬🇧 English', 'setlang:ENGLISH');
}
