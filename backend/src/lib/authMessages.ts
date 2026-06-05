/**
 * Localized owner-auth messages sent from the backend directly through the
 * platform bot (Telegram Bot API). Kept minimal — only the messages the
 * backend itself sends. The enrollment in-chat messages live in the bot.
 */

export type AuthLang = 'UZBEK' | 'RUSSIAN' | 'ENGLISH';

export function resolveAuthLang(value: string | null | undefined): AuthLang {
  if (value === 'RUSSIAN' || value === 'ENGLISH' || value === 'UZBEK') return value;
  return 'UZBEK';
}

/** The returning-login code message (5-minute validity). parse_mode = HTML. */
export function loginCodeMessage(lang: AuthLang, code: string): string {
  switch (lang) {
    case 'RUSSIAN':
      return (
        `🔐 Ваш код для входа: <b>${code}</b>\n\n` +
        `Введите его в приложении, чтобы войти. Код действителен 5 минут.\n\n` +
        `Если это были не вы — проигнорируйте это сообщение.`
      );
    case 'ENGLISH':
      return (
        `🔐 Your login code is: <b>${code}</b>\n\n` +
        `Enter it in the app to sign in. The code is valid for 5 minutes.\n\n` +
        `If this wasn't you, you can ignore this message.`
      );
    case 'UZBEK':
    default:
      return (
        `🔐 Kirish kodingiz: <b>${code}</b>\n\n` +
        `Ilovaga kirish uchun uni kiriting. Kod 5 daqiqa amal qiladi.\n\n` +
        `Agar bu siz bo'lmasangiz, ushbu xabarga e'tibor bermang.`
      );
  }
}
