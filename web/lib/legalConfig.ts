// Single source of truth for the public legal pages (/privacy and /offer).
//
// Everything the author edits lives here: changeable company values, the
// processor list, localized titles, the effective-date/version line, and the
// document bodies. The pages render from this file and substitute {{tokens}} at
// display time (see applyTokens in resolveLang.ts).
//
// IMPORTANT: the body paragraphs are TODO placeholders only. Real legal text is
// supplied later with counsel. Do not treat any paragraph here as final wording.

import type { Lang } from './resolveLang'

export type Processor = { name: string; purpose: string; location: string }

export type LegalConfig = {
  companyName: string
  legalEntity: string
  entityType: string
  tin: string
  contactEmail: string
  contactAddress: string
  privacyUrl: string
  offerUrl: string
  effectiveDate: string
  documentVersion: string
  deletionWindowDays: string
  processors: Processor[]
}

export type Section = { heading: string; paragraphs: string[] }
export type LangBodies = { uz: Section[]; ru: Section[]; en: Section[] }

// ---- Changeable values (PLACEHOLDERS to replace) ---------------------------
// Absolute privacyUrl / offerUrl are for citation INSIDE legal body text via
// tokens. On-page navigation between the two documents uses relative paths.
export const legalConfig = {
  companyName: '[TODO: company name]',
  legalEntity: '[TODO: legal entity]',
  entityType: '[TODO: entity type]',
  tin: '[TODO: TIN]',
  contactEmail: '[TODO: contact email]',
  contactAddress: '[TODO: contact address]',
  privacyUrl: 'https://dealio.uz/privacy',
  offerUrl: 'https://dealio.uz/offer',
  effectiveDate: '[TODO: effective date]',
  documentVersion: '[TODO: version]',
  deletionWindowDays: '[TODO: deletion window days]',
  processors: [
    { name: 'Railway / Neon', purpose: '[TODO: purpose]', location: '[TODO: location]' },
    { name: 'Cloudflare R2', purpose: '[TODO: purpose]', location: '[TODO: location]' },
    { name: 'Firebase / Google FCM', purpose: '[TODO: purpose]', location: '[TODO: location]' },
    { name: 'Telegram', purpose: '[TODO: purpose]', location: '[TODO: location]' },
  ],
} satisfies LegalConfig

// ---- Localized page titles -------------------------------------------------
export const privacyTitles: Record<Lang, string> = {
  uz: 'Maxfiylik siyosati',
  ru: 'Политика конфиденциальности',
  en: 'Privacy Policy',
}

export const offerTitles: Record<Lang, string> = {
  uz: 'Ommaviy oferta',
  ru: 'Публичная оферта',
  en: 'Public Offer',
}

// ---- Localized "last updated / version" line (tokens substituted at render) -
export const dateLineByLang: Record<Lang, string> = {
  uz: '{{effectiveDate}} dan amal qiladi · versiya {{documentVersion}}',
  ru: 'Действует с {{effectiveDate}} · версия {{documentVersion}}',
  en: 'Effective {{effectiveDate}} · version {{documentVersion}}',
}

// ---- TODO placeholder paragraphs (NOT legal text) --------------------------
const TODO = { uz: '[TODO: matn]', ru: '[TODO: текст]', en: '[TODO: text]' }

// Offer section 6 carries an extra author reminder (still a TODO placeholder,
// not final wording): the owner is responsible for the lawful basis to collect
// THEIR customers' data and must not enter special category data in free text
// fields. Kept as a bracketed note so it is obviously a placeholder.
const OWNER_DATA_NOTE =
  "[TODO note: the owner is responsible for the lawful basis to collect their own customers' data, and must not enter special category data into free text fields. Confirm final wording with counsel.]"

// ---- Privacy policy bodies (headings localized, paragraphs are TODO) -------
export const privacyPolicy: LangBodies = {
  uz: [
    { heading: 'Operator', paragraphs: [TODO.uz] },
    { heading: "Biz to'playdigan ma'lumotlar", paragraphs: [TODO.uz] },
    { heading: 'Ishlov berish maqsadlari', paragraphs: [TODO.uz] },
    { heading: 'Huquqiy asoslar', paragraphs: [TODO.uz] },
    { heading: 'Uchinchi shaxslar', paragraphs: [TODO.uz] },
    { heading: "Ma'lumotlar qayerda saqlanadi", paragraphs: [TODO.uz] },
    { heading: "Saqlash va o'chirish", paragraphs: [`${TODO.uz} {{deletionWindowDays}}`] },
    { heading: 'Sizning huquqlaringiz', paragraphs: [TODO.uz] },
    { heading: 'Aloqa', paragraphs: [`${TODO.uz} {{contactEmail}} {{contactAddress}}`] },
  ],
  ru: [
    { heading: 'Оператор', paragraphs: [TODO.ru] },
    { heading: 'Собираемые данные', paragraphs: [TODO.ru] },
    { heading: 'Цели обработки', paragraphs: [TODO.ru] },
    { heading: 'Правовые основания', paragraphs: [TODO.ru] },
    { heading: 'Третьи лица', paragraphs: [TODO.ru] },
    { heading: 'Место хранения данных', paragraphs: [TODO.ru] },
    { heading: 'Хранение и удаление', paragraphs: [`${TODO.ru} {{deletionWindowDays}}`] },
    { heading: 'Ваши права', paragraphs: [TODO.ru] },
    { heading: 'Контакты', paragraphs: [`${TODO.ru} {{contactEmail}} {{contactAddress}}`] },
  ],
  en: [
    { heading: 'Operator', paragraphs: [TODO.en] },
    { heading: 'Data we collect', paragraphs: [TODO.en] },
    { heading: 'Purposes of processing', paragraphs: [TODO.en] },
    { heading: 'Legal basis', paragraphs: [TODO.en] },
    { heading: 'Third parties', paragraphs: [TODO.en] },
    { heading: 'Where data is stored', paragraphs: [TODO.en] },
    { heading: 'Retention and deletion', paragraphs: [`${TODO.en} {{deletionWindowDays}}`] },
    { heading: 'Your rights', paragraphs: [TODO.en] },
    { heading: 'Contact', paragraphs: [`${TODO.en} {{contactEmail}} {{contactAddress}}`] },
  ],
}

// ---- Public offer bodies (headings localized, paragraphs are TODO) ---------
export const publicOffer: LangBodies = {
  uz: [
    { heading: 'Umumiy qoidalar', paragraphs: [TODO.uz] },
    { heading: "Ta'riflar", paragraphs: [TODO.uz] },
    { heading: 'Oferta predmeti', paragraphs: [TODO.uz] },
    { heading: "Ro'yxatdan o'tish va hisob", paragraphs: [TODO.uz] },
    { heading: "Tariflar va to'lov", paragraphs: [TODO.uz] },
    { heading: 'Tomonlarning majburiyatlari', paragraphs: [TODO.uz, OWNER_DATA_NOTE] },
    { heading: "Ma'lumotlarni himoya qilish", paragraphs: [`${TODO.uz} {{privacyUrl}}`] },
    { heading: 'Javobgarlik', paragraphs: [TODO.uz] },
    { heading: "Hisobni to'xtatib turish", paragraphs: [TODO.uz] },
    { heading: 'Yakuniy qoidalar', paragraphs: [TODO.uz] },
  ],
  ru: [
    { heading: 'Общие положения', paragraphs: [TODO.ru] },
    { heading: 'Определения', paragraphs: [TODO.ru] },
    { heading: 'Предмет оферты', paragraphs: [TODO.ru] },
    { heading: 'Регистрация и учётная запись', paragraphs: [TODO.ru] },
    { heading: 'Тарифы и оплата', paragraphs: [TODO.ru] },
    { heading: 'Обязанности сторон', paragraphs: [TODO.ru, OWNER_DATA_NOTE] },
    { heading: 'Защита данных', paragraphs: [`${TODO.ru} {{privacyUrl}}`] },
    { heading: 'Ответственность', paragraphs: [TODO.ru] },
    { heading: 'Приостановление аккаунта', paragraphs: [TODO.ru] },
    { heading: 'Заключительные положения', paragraphs: [TODO.ru] },
  ],
  en: [
    { heading: 'General provisions', paragraphs: [TODO.en] },
    { heading: 'Definitions', paragraphs: [TODO.en] },
    { heading: 'Subject of the offer', paragraphs: [TODO.en] },
    { heading: 'Registration and account', paragraphs: [TODO.en] },
    { heading: 'Plans and payment', paragraphs: [TODO.en] },
    { heading: 'Obligations of the parties', paragraphs: [TODO.en, OWNER_DATA_NOTE] },
    { heading: 'Data protection', paragraphs: [`${TODO.en} {{privacyUrl}}`] },
    { heading: 'Liability', paragraphs: [TODO.en] },
    { heading: 'Account suspension', paragraphs: [TODO.en] },
    { heading: 'Final provisions', paragraphs: [TODO.en] },
  ],
}
