// Localization for the central PLATFORM bot (owner authentication only).
// Separate from the per-business customer i18n. Language is chosen from the
// Telegram client's language_code since the owner has no stored preference yet.

export type PlatformLang = 'UZBEK' | 'RUSSIAN' | 'ENGLISH';

/** Map a Telegram language_code (e.g. "ru", "uz", "en-US") to a PlatformLang. */
export function platformLang(code: string | undefined | null): PlatformLang {
  const c = (code ?? '').toLowerCase();
  if (c.startsWith('ru')) return 'RUSSIAN';
  if (c.startsWith('uz')) return 'UZBEK';
  if (c.startsWith('en')) return 'ENGLISH';
  return 'UZBEK'; // default for the target market
}

type Entry = { UZBEK: string; RUSSIAN: string; ENGLISH: string };

const messages: Record<string, Entry> = {
  // Shown when /start arrives without a deep-link token.
  noToken: {
    UZBEK:
      "👋 Bu — hisobingizga kirish uchun rasmiy bot.\n\nIltimos, ilovadagi havola orqali oching.",
    RUSSIAN:
      '👋 Это официальный бот для входа в ваш аккаунт.\n\nПожалуйста, откройте его по ссылке из приложения.',
    ENGLISH:
      '👋 This is the official sign-in bot for your account.\n\nPlease open it using the link inside the app.',
  },
  // /start with a valid token — ask to share the phone number.
  startPrompt: {
    UZBEK:
      "👋 Xush kelibsiz!\n\nDavom etish uchun telefon raqamingizni ulashing — quyidagi tugmani bosing.",
    RUSSIAN:
      '👋 Добро пожаловать!\n\nЧтобы продолжить, поделитесь номером телефона — нажмите кнопку ниже.',
    ENGLISH:
      '👋 Welcome!\n\nTo continue, share your phone number — tap the button below.',
  },
  shareContactBtn: {
    UZBEK: '📱 Telefon raqamni ulashish',
    RUSSIAN: '📱 Поделиться номером',
    ENGLISH: '📱 Share my phone number',
  },
  // The link token was not found / already used.
  linkInvalid: {
    UZBEK:
      "❌ Bu havola yaroqsiz yoki allaqachon ishlatilgan.\n\nIltimos, ilovada qaytadan boshlang.",
    RUSSIAN:
      '❌ Эта ссылка недействительна или уже использована.\n\nПожалуйста, начните заново в приложении.',
    ENGLISH:
      "❌ This link is invalid or already used.\n\nPlease start again from the app.",
  },
  // The link token expired (10-min window).
  linkExpired: {
    UZBEK:
      "⌛️ Havola muddati tugagan.\n\nIltimos, ilovada qaytadan boshlang.",
    RUSSIAN:
      '⌛️ Срок действия ссылки истёк.\n\nПожалуйста, начните заново в приложении.',
    ENGLISH: '⌛️ This link has expired.\n\nPlease start again from the app.',
  },
  // Shared contact does not belong to the sender (forwarded/foreign contact).
  foreignContact: {
    UZBEK:
      "⚠️ Iltimos, faqat o'zingizning telefon raqamingizni ulashing.\n\nTugma orqali ulashib ko'ring.",
    RUSSIAN:
      '⚠️ Пожалуйста, поделитесь только своим собственным номером.\n\nИспользуйте кнопку, чтобы поделиться.',
    ENGLISH:
      "⚠️ Please share only your own phone number.\n\nUse the button to share your contact.",
  },
  // Contact arrived but we lost the enrollment context (e.g. bot restarted).
  startOver: {
    UZBEK: "Iltimos, ilovadagi havola orqali qaytadan boshlang.",
    RUSSIAN: 'Пожалуйста, начните заново по ссылке из приложения.',
    ENGLISH: 'Please start again using the link from the app.',
  },
  // Success — show the 6-digit code. {code} is substituted.
  codeMessage: {
    UZBEK:
      "✅ Rahmat!\n\nKodingiz: <b>{code}</b>\n\nYakunlash uchun ushbu kodni ilovaga kiriting. Kod 5 daqiqa amal qiladi.",
    RUSSIAN:
      '✅ Спасибо!\n\nВаш код: <b>{code}</b>\n\nВведите этот код в приложении, чтобы завершить. Код действителен 5 минут.',
    ENGLISH:
      '✅ Thank you!\n\nYour code is: <b>{code}</b>\n\nEnter this code in the app to finish. The code is valid for 5 minutes.',
  },
  genericError: {
    UZBEK: "Nimadir xato ketdi. Iltimos, birozdan so'ng qayta urinib ko'ring.",
    RUSSIAN: 'Что-то пошло не так. Пожалуйста, попробуйте позже.',
    ENGLISH: 'Something went wrong. Please try again shortly.',
  },
};

export function pt(
  lang: PlatformLang,
  key: string,
  params?: Record<string, string | number>,
): string {
  const entry = messages[key];
  if (!entry) return key;
  let value = entry[lang] || entry.ENGLISH;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.split(`{${k}}`).join(String(v));
    }
  }
  return value;
}
