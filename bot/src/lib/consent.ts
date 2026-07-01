import { InlineKeyboard } from 'grammy';
import { MyContext } from './types.js';
import { getLang } from './lang.js';
import { getCustomerLanguage, upsertCustomer } from './api.js';
import { escapeHtml } from './format.js';
import { t } from './i18n.js';

/**
 * First-contact data-subject consent (ZRU-547). A customer is "consented" ONLY
 * if consentedAt is set AND consentVersion equals the CURRENT in-force PRIVACY
 * version — read live from the backend (LegalDocument), NOT hardcoded here. An
 * admin publishing a new PRIVACY version therefore forces every customer to
 * re-consent at their next entry point. The single acceptance covers ordinary
 * processing AND cross-border transfer.
 */

/** True when the customer has NOT recorded consent for the current version. */
export async function needsConsent(ctx: MyContext): Promise<boolean> {
  const telegramUserId = String(ctx.from?.id ?? '');
  if (!telegramUserId) return true;
  try {
    const info = await getCustomerLanguage(ctx.botUsername, telegramUserId);
    // Compare the stored consent version against the LIVE in-force version from
    // the backend (same comparison as before — only the source of the current
    // version changed from a hardcoded constant to the DB).
    return !(info.consentedAt && info.consentVersion === info.currentPrivacyVersion);
  } catch {
    // If we can't verify, DEFAULT TO GATING — never store data without consent.
    return true;
  }
}

/**
 * Show the first-contact consent gate. Records what to resume after acceptance
 * (undefined = came from /start). Copy follows the business language via the
 * standard getLang path (which resolves to the business language at first
 * contact). Renders with or without the privacy link; never crashes, never skips.
 */
export async function showConsentGate(
  ctx: MyContext,
  returnTo?: 'checkout' | 'booking',
): Promise<void> {
  ctx.session.consentReturnTo = returnTo;
  const lang = await getLang(ctx);

  let businessName = 'this business';
  try {
    const info = await getCustomerLanguage(ctx.botUsername, String(ctx.from?.id ?? ''));
    if (info.businessName) businessName = info.businessName;
  } catch {
    // Keep the fallback name — still render the gate.
  }

  let text = t(lang, 'consentNotice', { business: escapeHtml(businessName) });
  const baseUrl = process.env.PRIVACY_POLICY_URL;
  if (baseUrl) {
    // Language-aware policy link: open the policy in the business language
    // (UZBEK→uz, RUSSIAN→ru, ENGLISH→en) so `${PRIVACY_POLICY_URL}?lang=uz|ru`.
    // If PRIVACY_POLICY_URL is unset the gate still renders — the link is just
    // omitted (handled by this `if`); never crash, never skip the gate.
    const langParam = lang === 'RUSSIAN' ? 'ru' : lang === 'ENGLISH' ? 'en' : 'uz';
    const sep = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${sep}lang=${langParam}`;
    text += '\n\n' + t(lang, 'consentPolicyLine', { url: escapeHtml(url) });
  }

  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard()
      .text(t(lang, 'consentAgree'), 'consent_agree')
      .text(t(lang, 'consentDecline'), 'consent_decline'),
  });
}

/**
 * Record consent, creating/updating the customer with consentedAt +
 * consentVersion. This is the FIRST personal-data write and is gated behind
 * acceptance. Idempotent — keyed by (business, telegramUserId) on the backend, so
 * rapid double-taps can never create two customers or double-write.
 */
export async function recordConsent(ctx: MyContext): Promise<void> {
  // Record consent AGAINST the live in-force PRIVACY version (fetched from the
  // backend), so the stored consentVersion matches exactly what needsConsent
  // compares against. If the lookup fails we throw (the caller shows a retry) —
  // never record consent against a guessed/stale version.
  const telegramUserId = String(ctx.from?.id ?? '');
  const info = await getCustomerLanguage(ctx.botUsername, telegramUserId);
  await upsertCustomer({
    botUsername: ctx.botUsername,
    telegramUserId,
    telegramUsername: ctx.from?.username,
    name: ctx.from?.first_name ?? 'Customer',
    consentedAt: new Date().toISOString(),
    consentVersion: info.currentPrivacyVersion,
  });
}
