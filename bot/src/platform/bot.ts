import { Bot, Context, session, SessionFlavor, Keyboard, InlineKeyboard } from 'grammy';
import { platformStart, platformContact } from './api.js';
import { pt, platformLang } from './i18n.js';

/**
 * The central PLATFORM bot — owner authentication only. SEPARATE from the
 * per-business customer bots and additive to them. Driven by PLATFORM_BOT_TOKEN.
 *
 * Two steps:
 *   1. /start <token>  — bind the chat to the enrollment link token, then ask
 *      the user to Share Contact (native request_contact button).
 *   2. contact shared  — verify the contact belongs to the sender, bind the
 *      phone, and reply with the 6-digit ENROLL code to enter in the app.
 */

interface PlatformSession {
  enrollToken?: string;
}

type PlatformContext = Context & SessionFlavor<PlatformSession>;

const REMOVE_KEYBOARD = { remove_keyboard: true } as const;

export function createPlatformBot(token: string): Bot<PlatformContext> {
  const bot = new Bot<PlatformContext>(token);

  bot.use(session<PlatformSession, PlatformContext>({ initial: () => ({}) }));

  // ── /start <token> ────────────────────────────────────────────────────────
  bot.command('start', async (ctx) => {
    const lang = platformLang(ctx.from?.language_code);
    const startToken = (ctx.match ?? '').trim();

    if (!startToken) {
      await ctx.reply(pt(lang, 'noToken'));
      return;
    }

    const chatId = String(ctx.from?.id ?? ctx.chat?.id ?? '');
    if (!chatId) {
      await ctx.reply(pt(lang, 'genericError'));
      return;
    }

    try {
      const res = await platformStart(startToken, chatId);
      if (!res.ok) {
        await ctx.reply(pt(lang, res.reason === 'expired' ? 'linkExpired' : 'linkInvalid'));
        return;
      }

      // Remember which token this chat is enrolling for the contact step.
      ctx.session.enrollToken = startToken;

      const keyboard = new Keyboard()
        .requestContact(pt(lang, 'shareContactBtn'))
        .resized()
        .oneTime();

      await ctx.reply(pt(lang, 'startPrompt'), { reply_markup: keyboard });
    } catch (err) {
      console.error('[platform-bot] /start failed:', err);
      await ctx.reply(pt(lang, 'genericError'));
    }
  });

  // ── Contact shared ────────────────────────────────────────────────────────
  bot.on('message:contact', async (ctx) => {
    const lang = platformLang(ctx.from?.language_code);
    const contact = ctx.message.contact;
    const fromId = String(ctx.from?.id ?? '');
    const contactUserId = contact.user_id != null ? String(contact.user_id) : '';

    // SECURITY CHECK: the shared contact must belong to the sender. A forwarded
    // or manually-picked foreign contact has a different (or absent) user_id.
    if (!contactUserId || contactUserId !== fromId) {
      await ctx.reply(pt(lang, 'foreignContact'), { reply_markup: REMOVE_KEYBOARD });
      return;
    }

    const enrollToken = ctx.session.enrollToken;
    if (!enrollToken) {
      await ctx.reply(pt(lang, 'startOver'), { reply_markup: REMOVE_KEYBOARD });
      return;
    }

    try {
      const res = await platformContact({
        token: enrollToken,
        chatId: fromId,
        phone: contact.phone_number,
        contactUserId,
        fromId,
      });

      if (!res.ok || !res.code) {
        const key =
          res.reason === 'expired'
            ? 'linkExpired'
            : res.reason === 'foreign_contact'
              ? 'foreignContact'
              : 'linkInvalid';
        await ctx.reply(pt(lang, key), { reply_markup: REMOVE_KEYBOARD });
        return;
      }

      // Single-use: clear so a second contact share can't re-issue against it.
      ctx.session.enrollToken = undefined;

      // Code blurred via spoiler in the text; a copy_text button gives one-tap
      // copy (the spoiler hides it from notification previews). The contact
      // keyboard was one-time, so it has already collapsed by now.
      await ctx.reply(pt(lang, 'codeMessage', { code: res.code }), {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().copyText(pt(lang, 'copyButton'), res.code),
      });
    } catch (err) {
      console.error('[platform-bot] contact failed:', err);
      await ctx.reply(pt(lang, 'genericError'), { reply_markup: REMOVE_KEYBOARD });
    }
  });

  bot.catch((err) => {
    console.error('[platform-bot] Error while handling update:', err.error);
  });

  return bot;
}
