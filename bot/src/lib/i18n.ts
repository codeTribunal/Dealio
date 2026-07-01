// Bot localization. Customer-facing messages use the customer's
// languagePreference (UZBEK | RUSSIAN | ENGLISH). When a customer has not
// chosen a language yet, callers fall back to the business language.

export type Lang = 'UZBEK' | 'RUSSIAN' | 'ENGLISH';

const FALLBACK: Lang = 'UZBEK';

/** Normalize a possibly-null preference + business language into a concrete Lang. */
export function resolveLang(
  pref: string | null | undefined,
  businessLang?: string | null,
): Lang {
  const candidate = pref ?? businessLang;
  if (candidate === 'RUSSIAN' || candidate === 'ENGLISH' || candidate === 'UZBEK') {
    return candidate;
  }
  return FALLBACK;
}

type Entry = { UZBEK: string; RUSSIAN: string; ENGLISH: string };

const messages: Record<string, Entry> = {
  // ── Language picker ──────────────────────────────────────────────
  chooseLanguage: {
    UZBEK: 'Tilni tanlang / Выберите язык / Choose your language',
    RUSSIAN: 'Tilni tanlang / Выберите язык / Choose your language',
    ENGLISH: 'Tilni tanlang / Выберите язык / Choose your language',
  },
  languageSet: {
    UZBEK: 'Til o\'zbekchaga o\'rnatildi ✅',
    RUSSIAN: 'Язык изменён на русский ✅',
    ENGLISH: 'Language set to English ✅',
  },
  // ── Welcome / menu ───────────────────────────────────────────────
  welcome: {
    UZBEK: '👋 Assalomu alaykum, {name}!\n\nXush kelibsiz! Boshlash uchun quyidagi tugmalardan foydalaning.',
    RUSSIAN: '👋 Здравствуйте, {name}!\n\nДобро пожаловать! Используйте кнопки ниже, чтобы начать.',
    ENGLISH: '👋 Hello, {name}!\n\nWelcome! Use the buttons below to get started.',
  },
  // First-contact consent gate (ZRU-547). {business} is HTML-escaped by the caller.
  consentNotice: {
    UZBEK:
      '<b>{business}</b> xizmatidan foydalanish uchun shaxsiy ma\'lumotlaringizni qayta ishlashga rozilik bering.\n\n' +
      'Davom etsangiz, ismingiz, telefon raqamingiz, yetkazib berish manzilingiz, Telegram ma\'lumotlaringiz hamda buyurtma va navbatlar tarixi {business} tomonidan Dealio platformasi orqali qayta ishlanishiga va O\'zbekistondan tashqarida joylashgan serverlarda saqlanishiga rozilik bildirasiz.',
    RUSSIAN:
      'Для использования сервиса <b>{business}</b> дайте согласие на обработку ваших персональных данных.\n\n' +
      'Продолжая, вы соглашаетесь, что ваше имя, номер телефона, адрес доставки, данные Telegram, а также история заказов и записей будут обрабатываться компанией {business} через платформу Dealio и храниться на серверах, расположенных за пределами Узбекистана.',
    ENGLISH:
      'To use <b>{business}</b>, please consent to the processing of your personal data.\n\n' +
      'By continuing, you agree that your name, phone number, delivery address, Telegram identity, and order/appointment history will be processed by {business} through the Dealio platform and stored on servers located outside Uzbekistan.',
  },
  // Appended when PRIVACY_POLICY_URL is set. {url} is HTML-escaped by the caller.
  consentPolicyLine: {
    UZBEK: 'Maxfiylik siyosati: {url}',
    RUSSIAN: 'Политика конфиденциальности: {url}',
    ENGLISH: 'Privacy policy: {url}',
  },
  consentAgree: {
    UZBEK: '✅ Roziman',
    RUSSIAN: '✅ Соглашаюсь',
    ENGLISH: '✅ I agree',
  },
  consentDecline: {
    UZBEK: 'Bekor qilish',
    RUSSIAN: 'Отмена',
    ENGLISH: 'Cancel',
  },
  consentDeclined: {
    UZBEK: 'Rozilik berilmagani sababli davom eta olmaymiz. Fikringizni o\'zgartirsangiz, /start buyrug\'ini yuboring.',
    RUSSIAN: 'Без вашего согласия мы не можем продолжить. Если передумаете — отправьте /start.',
    ENGLISH: 'We can\'t continue without your consent. If you change your mind, send /start.',
  },
  consentSaveError: {
    UZBEK: '⚠️ Xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.',
    RUSSIAN: '⚠️ Произошла ошибка. Пожалуйста, попробуйте ещё раз.',
    ENGLISH: '⚠️ Something went wrong. Please try again.',
  },
  // ── Navigation (no emojis) ───────────────────────────────────────────
  backToMenu: {
    UZBEK: 'Bosh sahifa',
    RUSSIAN: 'Главная',
    ENGLISH: 'Menu',
  },
  menuDeleteData: {
    UZBEK: 'Ma\'lumotlarimni o\'chirish',
    RUSSIAN: 'Удалить мои данные',
    ENGLISH: 'Delete my data',
  },
  // Persistent command-menu descriptions (setMyCommands). Plain text, no emojis.
  cmdStart: {
    UZBEK: 'Bosh sahifa',
    RUSSIAN: 'Главное меню',
    ENGLISH: 'Main menu',
  },
  cmdOrders: {
    UZBEK: 'Buyurtmalarim',
    RUSSIAN: 'Мои заказы',
    ENGLISH: 'My orders',
  },
  cmdAppointments: {
    UZBEK: 'Navbatlarim',
    RUSSIAN: 'Мои записи',
    ENGLISH: 'My appointments',
  },
  cmdProjects: {
    UZBEK: 'Loyihalarim',
    RUSSIAN: 'Мои проекты',
    ENGLISH: 'My projects',
  },
  cmdHelp: {
    UZBEK: 'Yordam',
    RUSSIAN: 'Помощь',
    ENGLISH: 'Help',
  },
  cmdDeleteData: {
    UZBEK: 'Ma\'lumotlarimni o\'chirish',
    RUSSIAN: 'Удалить мои данные',
    ENGLISH: 'Delete my data',
  },
  // ── Customer data deletion (ZRU-547). Plain text, no emojis. ──────────
  deleteDataConfirm: {
    UZBEK:
      'Shaxsiy ma\'lumotlaringizni o\'chirishni xohlaysizmi? Bu amalni bekor qilib bo\'lmaydi.\n\n' +
      'Quyidagilar butunlay o\'chiriladi: ismingiz, telefon raqamingiz, yetkazib berish manzilingiz, Telegram ma\'lumotlaringiz va siz haqingizdagi eslatmalar.\n\n' +
      'Buyurtma va navbatlaringiz tarixi (raqamlar, summalar, sanalar va holat) biznesning hisob-kitob va qonuniy talablari uchun saqlanadi, lekin ismingiz, telefoningiz va manzilingiz ulardan olib tashlanadi.',
    RUSSIAN:
      'Вы хотите удалить свои персональные данные? Это действие необратимо.\n\n' +
      'Будут безвозвратно удалены: ваше имя, номер телефона, адрес доставки, данные Telegram и заметки о вас.\n\n' +
      'История ваших заказов и записей (номера, суммы, даты и статус) сохраняется для бухгалтерских и юридических целей бизнеса, но ваше имя, телефон и адрес из неё удаляются.',
    ENGLISH:
      'Do you want to delete your personal data? This cannot be undone.\n\n' +
      'The following will be permanently erased: your name, phone number, delivery address, Telegram identity, and any notes about you.\n\n' +
      'Your order and appointment history (numbers, amounts, dates, and status) is kept for the business\'s accounting and legal records, but your name, phone, and address are removed from it.',
  },
  deleteDataYes: {
    UZBEK: 'Ha, ma\'lumotlarimni o\'chir',
    RUSSIAN: 'Да, удалить мои данные',
    ENGLISH: 'Yes, delete my data',
  },
  deleteDataDone: {
    UZBEK: 'Shaxsiy ma\'lumotlaringiz o\'chirildi.',
    RUSSIAN: 'Ваши персональные данные удалены.',
    ENGLISH: 'Your personal data has been deleted.',
  },
  browseCatalog: {
    UZBEK: '🛍 Katalogni ko\'rish',
    RUSSIAN: '🛍 Смотреть каталог',
    ENGLISH: '🛍 Browse catalog',
  },
  bookAppointment: {
    UZBEK: '📅 Navbatga yozilish',
    RUSSIAN: '📅 Записаться',
    ENGLISH: '📅 Book appointment',
  },
  myAppointments: {
    UZBEK: '📋 Mening navbatlarim',
    RUSSIAN: '📋 Мои записи',
    ENGLISH: '📋 My appointments',
  },
  myProjects: {
    UZBEK: '📁 Mening loyihalarim',
    RUSSIAN: '📁 Мои проекты',
    ENGLISH: '📁 My projects',
  },
  myOrders: {
    UZBEK: '📦 Mening buyurtmalarim',
    RUSSIAN: '📦 Мои заказы',
    ENGLISH: '📦 My orders',
  },
  languageMenu: {
    UZBEK: '🌐 Til / Язык / Language',
    RUSSIAN: '🌐 Til / Язык / Language',
    ENGLISH: '🌐 Til / Язык / Language',
  },
  bookAnother: {
    UZBEK: '📅 Yana yozilish',
    RUSSIAN: '📅 Записаться ещё',
    ENGLISH: '📅 Book another',
  },
  viewCart: {
    UZBEK: '🛒 Savatni ko\'rish',
    RUSSIAN: '🛒 Посмотреть корзину',
    ENGLISH: '🛒 View cart',
  },
  loading: {
    UZBEK: 'Yuklanmoqda...',
    RUSSIAN: 'Загрузка...',
    ENGLISH: 'Loading...',
  },
  // ── Help ─────────────────────────────────────────────────────────
  help: {
    UZBEK:
      '<b>Mavjud buyruqlar:</b>\n\n' +
      '/start — Asosiy menyu\n' +
      '/orders — Buyurtmalaringiz\n' +
      '/appointments — Navbatlaringiz\n' +
      '/projects — Loyihalaringiz\n' +
      '/cart — Savatingiz\n' +
      '/language — Tilni o\'zgartirish\n' +
      '/help — Ushbu xabarni ko\'rsatish\n' +
      '/deletedata — Shaxsiy ma\'lumotlarimni o\'chirish',
    RUSSIAN:
      '<b>Доступные команды:</b>\n\n' +
      '/start — Главное меню\n' +
      '/orders — Ваши заказы\n' +
      '/appointments — Ваши записи\n' +
      '/projects — Ваши проекты\n' +
      '/cart — Ваша корзина\n' +
      '/language — Изменить язык\n' +
      '/help — Показать это сообщение\n' +
      '/deletedata — Удалить мои персональные данные',
    ENGLISH:
      '<b>Available commands:</b>\n\n' +
      '/start — Main menu\n' +
      '/orders — View your recent orders\n' +
      '/appointments — View your upcoming appointments\n' +
      '/projects — View your active projects\n' +
      '/cart — View your cart\n' +
      '/language — Change language\n' +
      '/help — Show this message\n' +
      '/deletedata — Delete my personal data',
  },
  // ── Generic ──────────────────────────────────────────────────────
  cantIdentify: {
    UZBEK: 'Sizni aniqlay olmadik.',
    RUSSIAN: 'Не удалось вас идентифицировать.',
    ENGLISH: 'Could not identify you.',
  },
  genericError: {
    UZBEK: 'Nimadir xato ketdi. Qayta urinib ko\'ring yoki biz bilan bog\'laning.',
    RUSSIAN: 'Что-то пошло не так. Попробуйте снова или свяжитесь с нами.',
    ENGLISH: 'Something went wrong. Please try again or contact us.',
  },
  // ── Orders list ──────────────────────────────────────────────────
  ordersLoadError: {
    UZBEK: 'Buyurtmalarni yuklab bo\'lmadi. Keyinroq qayta urinib ko\'ring.',
    RUSSIAN: 'Не удалось загрузить заказы. Попробуйте позже.',
    ENGLISH: 'Could not load orders. Please try again later.',
  },
  noOrders: {
    UZBEK: 'Siz hali buyurtma bermagansiz.',
    RUSSIAN: 'Вы ещё не размещали заказов.',
    ENGLISH: 'You haven\'t placed any orders yet.',
  },
  yourOrders: {
    UZBEK: '<b>So\'nggi buyurtmalaringiz:</b>',
    RUSSIAN: '<b>Ваши последние заказы:</b>',
    ENGLISH: '<b>Your recent orders:</b>',
  },
  orderLine: {
    UZBEK: '{icon} <b>Buyurtma №{number}</b> — {total}\n   {date} • To\'lov: {payIcon} {payStatus}',
    RUSSIAN: '{icon} <b>Заказ №{number}</b> — {total}\n   {date} • Оплата: {payIcon} {payStatus}',
    ENGLISH: '{icon} <b>Order #{number}</b> — {total}\n   {date} • Payment: {payIcon} {payStatus}',
  },
  // ── Appointments list ────────────────────────────────────────────
  apptsLoadError: {
    UZBEK: 'Navbatlarni yuklab bo\'lmadi. Keyinroq qayta urinib ko\'ring.',
    RUSSIAN: 'Не удалось загрузить записи. Попробуйте позже.',
    ENGLISH: 'Could not load appointments. Please try again later.',
  },
  noAppts: {
    UZBEK: 'Sizda yaqinlashayotgan navbatlar yo\'q.',
    RUSSIAN: 'У вас нет предстоящих записей.',
    ENGLISH: 'You have no upcoming appointments.',
  },
  yourAppts: {
    UZBEK: '<b>Yaqinlashayotgan navbatlaringiz:</b>',
    RUSSIAN: '<b>Ваши предстоящие записи:</b>',
    ENGLISH: '<b>Your upcoming appointments:</b>',
  },
  apptLine: {
    UZBEK: '{icon} <b>{service}</b>{staffLine}\n   📅 {date} {time} da — {price}',
    RUSSIAN: '{icon} <b>{service}</b>{staffLine}\n   📅 {date} в {time} — {price}',
    ENGLISH: '{icon} <b>{service}</b>{staffLine}\n   📅 {date} at {time} — {price}',
  },
  withStaff: {
    UZBEK: ' ({staff})',
    RUSSIAN: ' ({staff})',
    ENGLISH: ' with {staff}',
  },
  // ── Payment (customer-facing) ────────────────────────────────────
  paymentNotificationReceived: {
    UZBEK: '✅ Rahmat! To\'lov haqidagi xabaringizni qabul qildik.\n\nDo\'kon egasi tez orada tasdiqlaydi.',
    RUSSIAN: '✅ Спасибо! Мы получили уведомление об оплате.\n\nВладелец магазина скоро подтвердит.',
    ENGLISH: '✅ Thank you! We have received your payment notification.\n\nThe store owner will confirm it shortly.',
  },
  paymentAlreadyConfirmed: {
    UZBEK: '✅ To\'lov allaqachon tasdiqlangan. Buyurtmangiz tayyorlanmoqda.',
    RUSSIAN: '✅ Оплата уже подтверждена. Ваш заказ обрабатывается.',
    ENGLISH: '✅ Payment already confirmed. Your order is being processed.',
  },
  paymentConfirmedCustomer: {
    UZBEK: '✅ <b>To\'lov tasdiqlandi!</b>\n\nBuyurtmangiz tayyorlanmoqda. Tayyor bo\'lganda xabar beramiz.',
    RUSSIAN: '✅ <b>Оплата подтверждена!</b>\n\nВаш заказ готовится. Мы сообщим, когда он будет готов.',
    ENGLISH: '✅ <b>Payment confirmed!</b>\n\nYour order is now being prepared. We\'ll let you know when it\'s ready.',
  },
  apptPaidThanks: {
    UZBEK: 'Rahmat! Biznes to\'lovingiz haqida xabardor qilindi. Navbatingiz tasdiqlanmoqda.',
    RUSSIAN: 'Спасибо! Бизнес уведомлён о вашей оплате. Ваша запись подтверждается.',
    ENGLISH: 'Thank you! The business has been notified of your payment. Your appointment is being confirmed.',
  },
  // ── Reminders ────────────────────────────────────────────────────
  reminderText: {
    UZBEK:
      '⏰ <b>{business} eslatmasi</b>\n\n' +
      'Sizda ertaga <b>{service}</b>{staffLine} navbati bor.\n' +
      '📅 {date} {time} da\n' +
      '💰 {price}\n\n' +
      'Bekor qilish kerak bo\'lsa, ushbu xabarga <b>CANCEL</b> deb javob bering.',
    RUSSIAN:
      '⏰ <b>Напоминание от {business}</b>\n\n' +
      'У вас завтра запись <b>{service}</b>{staffLine}.\n' +
      '📅 {date} в {time}\n' +
      '💰 {price}\n\n' +
      'Ответьте <b>CANCEL</b> на это сообщение, если нужно отменить.',
    ENGLISH:
      '⏰ <b>Reminder from {business}</b>\n\n' +
      'You have a <b>{service}</b>{staffLine} appointment tomorrow.\n' +
      '📅 {date} at {time}\n' +
      '💰 {price}\n\n' +
      'Reply <b>CANCEL</b> to this message if you need to cancel.',
  },
  cancelNoAppts: {
    UZBEK: 'Bekor qilish uchun yaqinlashayotgan navbatlaringiz yo\'q.',
    RUSSIAN: 'У вас нет предстоящих записей для отмены.',
    ENGLISH: 'You don\'t have any upcoming appointments to cancel.',
  },
  cancelConfirmed: {
    UZBEK: '✅ {date} kungi <b>{service}</b> navbatingiz bekor qilindi.\n\nXabar berganingiz uchun rahmat!',
    RUSSIAN: '✅ Ваша запись <b>{service}</b> на {date} отменена.\n\nСпасибо, что сообщили!',
    ENGLISH: '✅ Your <b>{service}</b> appointment on {date} has been cancelled.\n\nThank you for letting us know!',
  },
  cancelError: {
    UZBEK: 'Navbatingizni bekor qilib bo\'lmadi. Iltimos, biz bilan to\'g\'ridan-to\'g\'ri bog\'laning.',
    RUSSIAN: 'Не удалось отменить запись. Пожалуйста, свяжитесь с нами напрямую.',
    ENGLISH: 'Could not cancel your appointment. Please contact us directly.',
  },
  // ── Suspension ───────────────────────────────────────────────────
  suspended: {
    UZBEK: 'Bu xizmat vaqtincha mavjud emas. Iltimos, biznes bilan to\'g\'ridan-to\'g\'ri bog\'laning.',
    RUSSIAN: 'Этот сервис временно недоступен. Пожалуйста, свяжитесь с бизнесом напрямую.',
    ENGLISH: 'This service is temporarily unavailable. Please contact the business directly.',
  },
  // ── Catalog ──────────────────────────────────────────────────────
  catalogEmpty: {
    UZBEK: 'Hozircha mahsulotlar yo\'q. Keyinroq qayta tekshiring!',
    RUSSIAN: 'Пока нет товаров. Загляните позже!',
    ENGLISH: 'No products available yet. Check back soon!',
  },
  catalogLoadError: {
    UZBEK: 'Katalogni yuklab bo\'lmadi. Keyinroq qayta urinib ko\'ring.',
    RUSSIAN: 'Не удалось загрузить каталог. Попробуйте позже.',
    ENGLISH: 'Could not load catalog. Please try again later.',
  },
  chooseProduct: {
    UZBEK: 'Mahsulotni tanlang:',
    RUSSIAN: 'Выберите товар:',
    ENGLISH: 'Choose a product:',
  },
  productNotFound: {
    UZBEK: 'Mahsulot topilmadi.',
    RUSSIAN: 'Товар не найден.',
    ENGLISH: 'Product not found.',
  },
  cartButton: {
    UZBEK: '🛒 Savat ({count} ta)',
    RUSSIAN: '🛒 Корзина ({count})',
    ENGLISH: '🛒 Cart ({count} items)',
  },
  continueShopping: {
    UZBEK: '🛍 Xaridni davom ettirish',
    RUSSIAN: '🛍 Продолжить покупки',
    ENGLISH: '🛍 Continue shopping',
  },
  inStock: {
    UZBEK: '\n📦 Zaxirada: {qty}',
    RUSSIAN: '\n📦 В наличии: {qty}',
    ENGLISH: '\n📦 In stock: {qty}',
  },
  outOfStockLine: {
    UZBEK: '\n⚠️ Tugagan',
    RUSSIAN: '\n⚠️ Нет в наличии',
    ENGLISH: '\n⚠️ Out of stock',
  },
  prepTimeLabel: {
    UZBEK: '\n⏱ Tayyorlash vaqti: {time}',
    RUSSIAN: '\n⏱ Время подготовки: {time}',
    ENGLISH: '\n⏱ Prep time: {time}',
  },
  addedToCartFull: {
    UZBEK: '✅ Savatga {qty}× <b>{name}</b> qo\'shildi.\n\nSavat: {count} ta — <b>{total}</b>',
    RUSSIAN: '✅ В корзину добавлено {qty}× <b>{name}</b>.\n\nКорзина: {count} — <b>{total}</b>',
    ENGLISH: '✅ Added {qty}× <b>{name}</b> to cart.\n\nCart: {count} items — <b>{total}</b>',
  },
  removeItem: {
    UZBEK: 'O\'chirish: {name}',
    RUSSIAN: 'Удалить: {name}',
    ENGLISH: 'Remove: {name}',
  },
  backToCatalogText: {
    UZBEK: '« Katalogga qaytish',
    RUSSIAN: '« Назад в каталог',
    ENGLISH: '« Back to catalog',
  },
  catalogTitle: {
    UZBEK: '<b>🛍 Katalog</b>\n\nKo\'rish uchun mahsulotni tanlang:',
    RUSSIAN: '<b>🛍 Каталог</b>\n\nВыберите товар, чтобы посмотреть:',
    ENGLISH: '<b>🛍 Catalog</b>\n\nSelect a product to view:',
  },
  outOfStock: {
    UZBEK: 'Tugagan',
    RUSSIAN: 'Нет в наличии',
    ENGLISH: 'Out of stock',
  },
  addToCart: {
    UZBEK: '➕ Savatga qo\'shish',
    RUSSIAN: '➕ В корзину',
    ENGLISH: '➕ Add to cart',
  },
  addedToCart: {
    UZBEK: '✅ {name} savatga qo\'shildi',
    RUSSIAN: '✅ {name} добавлен в корзину',
    ENGLISH: '✅ {name} added to cart',
  },
  cartEmpty: {
    UZBEK: 'Savatingiz bo\'sh.',
    RUSSIAN: 'Ваша корзина пуста.',
    ENGLISH: 'Your cart is empty.',
  },
  cartTotal: {
    UZBEK: '<b>Jami: {total}</b>',
    RUSSIAN: '<b>Итого: {total}</b>',
    ENGLISH: '<b>Total: {total}</b>',
  },
  checkout: {
    UZBEK: '✅ Buyurtma berish',
    RUSSIAN: '✅ Оформить заказ',
    ENGLISH: '✅ Checkout',
  },
  backToCatalog: {
    UZBEK: '⬅️ Katalogga qaytish',
    RUSSIAN: '⬅️ Назад в каталог',
    ENGLISH: '⬅️ Back to catalog',
  },
  price: {
    UZBEK: 'Narx',
    RUSSIAN: 'Цена',
    ENGLISH: 'Price',
  },
  // ── Checkout flow ────────────────────────────────────────────────
  askName: {
    UZBEK: 'Ismingizni kiriting:',
    RUSSIAN: 'Введите ваше имя:',
    ENGLISH: 'Please enter your name:',
  },
  askPhone: {
    UZBEK: 'Telefon raqamingizni kiriting:',
    RUSSIAN: 'Введите ваш номер телефона:',
    ENGLISH: 'Please enter your phone number:',
  },
  askDelivery: {
    UZBEK: 'Yetkazib berish usulini tanlang:',
    RUSSIAN: 'Выберите способ получения:',
    ENGLISH: 'Choose a delivery method:',
  },
  pickup: {
    UZBEK: '🏪 Olib ketish',
    RUSSIAN: '🏪 Самовывоз',
    ENGLISH: '🏪 Pickup',
  },
  delivery: {
    UZBEK: '🚚 Yetkazib berish',
    RUSSIAN: '🚚 Доставка',
    ENGLISH: '🚚 Delivery',
  },
  askAddress: {
    UZBEK: 'Yetkazib berish manzilini kiriting:',
    RUSSIAN: 'Введите адрес доставки:',
    ENGLISH: 'Please enter your delivery address:',
  },
  askNotes: {
    UZBEK: 'Buyurtmaga izoh qo\'shasizmi? (yoki "yo\'q" deb yozing)',
    RUSSIAN: 'Хотите добавить комментарий к заказу? (или напишите «нет»)',
    ENGLISH: 'Any notes for your order? (or type "no")',
  },
  orderSummaryTitle: {
    UZBEK: '<b>Buyurtma xulosasi</b>',
    RUSSIAN: '<b>Сводка заказа</b>',
    ENGLISH: '<b>Order Summary</b>',
  },
  labelTotal: {
    UZBEK: 'Jami',
    RUSSIAN: 'Итого',
    ENGLISH: 'Total',
  },
  labelName: {
    UZBEK: 'Ism',
    RUSSIAN: 'Имя',
    ENGLISH: 'Name',
  },
  labelPhone: {
    UZBEK: 'Telefon',
    RUSSIAN: 'Телефон',
    ENGLISH: 'Phone',
  },
  labelDelivery: {
    UZBEK: 'Yetkazib berish',
    RUSSIAN: 'Доставка',
    ENGLISH: 'Delivery',
  },
  labelAddress: {
    UZBEK: 'Manzil',
    RUSSIAN: 'Адрес',
    ENGLISH: 'Address',
  },
  confirmOrder: {
    UZBEK: '✅ Buyurtmani tasdiqlash',
    RUSSIAN: '✅ Подтвердить заказ',
    ENGLISH: '✅ Confirm order',
  },
  cancel: {
    UZBEK: '❌ Bekor qilish',
    RUSSIAN: '❌ Отмена',
    ENGLISH: '❌ Cancel',
  },
  checkoutCancelled: {
    UZBEK: 'Buyurtma bekor qilindi.',
    RUSSIAN: 'Оформление отменено.',
    ENGLISH: 'Checkout cancelled.',
  },
  orderPlaced: {
    UZBEK: '🎉 <b>Buyurtmangiz qabul qilindi!</b>',
    RUSSIAN: '🎉 <b>Ваш заказ принят!</b>',
    ENGLISH: '🎉 <b>Your order has been placed!</b>',
  },
  paymentInstructions: {
    UZBEK:
      '💳 <b>To\'lov</b>\n\n' +
      '{amount} ni quyidagi kartaga o\'tkazing:\n' +
      '<code>{card}</code>\n' +
      '{name}\n\n' +
      'Izohga <b>#{reference}</b> deb yozing.',
    RUSSIAN:
      '💳 <b>Оплата</b>\n\n' +
      'Переведите {amount} на карту:\n' +
      '<code>{card}</code>\n' +
      '{name}\n\n' +
      'В комментарии укажите <b>#{reference}</b>.',
    ENGLISH:
      '💳 <b>Payment</b>\n\n' +
      'Transfer {amount} to the card:\n' +
      '<code>{card}</code>\n' +
      '{name}\n\n' +
      'Write <b>#{reference}</b> in the comment field.',
  },
  iHavePaid: {
    UZBEK: '✅ To\'ladim',
    RUSSIAN: '✅ Я оплатил',
    ENGLISH: '✅ I have paid',
  },
  paymentThanks: {
    UZBEK: '✅ Rahmat! To\'lovingiz haqida sotuvchiga xabar berildi. Tez orada tasdiqlaydi.',
    RUSSIAN: '✅ Спасибо! Продавец получил уведомление об оплате и скоро подтвердит.',
    ENGLISH: '✅ Thank you! The seller has been notified of your payment and will confirm shortly.',
  },
  paymentError: {
    UZBEK: '⚠️ To\'lov haqida xabar yuborib bo\'lmadi. Iltimos, "✅ To\'ladim" tugmasini qayta bosing.',
    RUSSIAN: '⚠️ Не удалось отправить уведомление об оплате. Нажмите «✅ Я оплатил» ещё раз.',
    ENGLISH: '⚠️ Couldn\'t send the payment notification. Please tap "✅ I have paid" again.',
  },
  // Prompt after "I have paid": the customer must send a payment screenshot.
  askPaymentProof: {
    UZBEK: '📸 To\'lov skrinshotini yuboring (rasm).',
    RUSSIAN: '📸 Отправьте скриншот оплаты (изображение).',
    ENGLISH: '📸 Please send a screenshot of your payment (as a photo or JPEG/PNG image).',
  },
  // Sent when the message at the proof step is not an image.
  paymentProofNotImage: {
    UZBEK: '⚠️ Iltimos, to\'lov skrinshotini rasm sifatida yuboring.',
    RUSSIAN: '⚠️ Пожалуйста, отправьте скриншот оплаты в виде изображения.',
    ENGLISH: '⚠️ Please send the payment screenshot as an image (photo or JPEG/PNG file).',
  },
  // Sent when download/upload of the proof fails — the customer should re-send.
  paymentProofFailed: {
    UZBEK: '⚠️ Skrinshotni saqlab bo\'lmadi. Iltimos, rasmni qayta yuboring.',
    RUSSIAN: '⚠️ Не удалось сохранить скриншот. Пожалуйста, отправьте изображение ещё раз.',
    ENGLISH: '⚠️ Couldn\'t save your screenshot. Please send the image again.',
  },
  orderError: {
    UZBEK: 'Buyurtmani rasmiylashtirib bo\'lmadi. Qayta urinib ko\'ring.',
    RUSSIAN: 'Не удалось оформить заказ. Попробуйте снова.',
    ENGLISH: 'Could not place your order. Please try again.',
  },
  cartEmptyCheckout: {
    UZBEK: 'Savatingiz bo\'sh. Avval katalogni ko\'ring!',
    RUSSIAN: 'Ваша корзина пуста. Сначала посмотрите каталог!',
    ENGLISH: 'Your cart is empty. Browse the catalog first!',
  },
  askNameQ: {
    UZBEK: 'Ismingiz nima?',
    RUSSIAN: 'Как вас зовут?',
    ENGLISH: 'What is your name?',
  },
  useThisName: {
    UZBEK: 'Tanlash: {name}',
    RUSSIAN: 'Использовать: {name}',
    ENGLISH: 'Use: {name}',
  },
  nameSetLabel: {
    UZBEK: 'Ism: <b>{name}</b>',
    RUSSIAN: 'Имя: <b>{name}</b>',
    ENGLISH: 'Name: <b>{name}</b>',
  },
  enterNameText: {
    UZBEK: 'Iltimos, ismingizni matn ko\'rinishida kiriting.',
    RUSSIAN: 'Пожалуйста, введите имя текстом.',
    ENGLISH: 'Please enter your name as text.',
  },
  askPhoneFull: {
    UZBEK: 'Telefon raqamingiz? (masalan, +998901234567)\n\nYoki quyidagi tugmani bosing:',
    RUSSIAN: 'Ваш номер телефона? (например, +998901234567)\n\nИли нажмите кнопку ниже:',
    ENGLISH: 'Your phone number? (e.g. +998901234567)\n\nOr tap the button below:',
  },
  shareContact: {
    UZBEK: '📱 Kontaktni ulashish',
    RUSSIAN: '📱 Поделиться контактом',
    ENGLISH: '📱 Share my contact',
  },
  phoneSetLabel: {
    UZBEK: 'Telefon: <b>{phone}</b>',
    RUSSIAN: 'Телефон: <b>{phone}</b>',
    ENGLISH: 'Phone: <b>{phone}</b>',
  },
  enterPhoneText: {
    UZBEK: 'Iltimos, telefon raqamingizni yozing yoki "📱 Kontaktni ulashish" tugmasini bosing.',
    RUSSIAN: 'Пожалуйста, введите номер телефона или нажмите «📱 Поделиться контактом».',
    ENGLISH: 'Please type your phone number or tap "📱 Share my contact".',
  },
  fieldRequired: {
    UZBEK: 'Bu maydon majburiy. Iltimos, javob bering.',
    RUSSIAN: 'Это поле обязательно. Пожалуйста, дайте ответ.',
    ENGLISH: 'This field is required. Please provide an answer.',
  },
  orderCancelledSaved: {
    UZBEK: 'Buyurtma bekor qilindi. Savatingiz saqlanib qoldi.',
    RUSSIAN: 'Заказ отменён. Ваша корзина сохранена.',
    ENGLISH: 'Order cancelled. Your cart is still saved.',
  },
  creatingOrder: {
    UZBEK: '⏳ Buyurtmangiz yaratilmoqda...',
    RUSSIAN: '⏳ Создаём ваш заказ...',
    ENGLISH: '⏳ Creating your order...',
  },
  orderCreateError: {
    UZBEK: 'Buyurtmani yaratishda xatolik yuz berdi: {msg}',
    RUSSIAN: 'Произошла ошибка при создании заказа: {msg}',
    ENGLISH: 'Something went wrong creating your order: {msg}',
  },
  orderOutOfStock: {
    UZBEK:
      '😔 Kechirasiz, {product} bu miqdorda mavjud emas. Savatingiz saqlandi — miqdorni kamaytiring yoki mahsulotni olib tashlab, qayta urinib ko\'ring.',
    RUSSIAN:
      '😔 Извините, {product} больше не доступен в таком количестве. Ваша корзина сохранена — уменьшите количество или удалите товар и попробуйте снова.',
    ENGLISH:
      '😔 Sorry, {product} is no longer available in that quantity. Your cart is saved — reduce the amount or remove it, then try again.',
  },
  orderPlacedNoPayment: {
    UZBEK: '✅ <b>№{number} buyurtma qabul qilindi!</b>\n\nTo\'lovni tasdiqlash uchun siz bilan bog\'lanamiz.',
    RUSSIAN: '✅ <b>Заказ №{number} принят!</b>\n\nМы свяжемся с вами для подтверждения оплаты.',
    ENGLISH: '✅ <b>Order #{number} placed!</b>\n\nWe will contact you to confirm payment.',
  },
  // Appended (on a new line) to a PICKUP order confirmation. {address} is HTML-
  // escaped by the caller before interpolation.
  pickupAddressLine: {
    UZBEK: '📍 Olib ketish manzili: {address}',
    RUSSIAN: '📍 Адрес самовывоза: {address}',
    ENGLISH: '📍 Pickup address: {address}',
  },
  // Appended (on a new line) to a booking confirmation. {address} is HTML-escaped
  // by the caller before interpolation.
  appointmentAddressLine: {
    UZBEK: '📍 Manzil: {address}',
    RUSSIAN: '📍 Адрес: {address}',
    ENGLISH: '📍 Address: {address}',
  },
  orderPlacedPayment: {
    UZBEK:
      '✅ <b>№{number} buyurtma qabul qilindi!</b>\n\n' +
      'Iltimos, <b>{amount}</b> ni quyidagi kartaga o\'tkazing:\n\n' +
      '<code>{card}</code>\n{name}\n\n' +
      '⚠️ To\'lov izohiga <b>#{number}</b> deb yozing.\n\n' +
      'O\'tkazgandan so\'ng quyidagi tugmani bosing:',
    RUSSIAN:
      '✅ <b>Заказ №{number} принят!</b>\n\n' +
      'Пожалуйста, переведите <b>{amount}</b> на карту:\n\n' +
      '<code>{card}</code>\n{name}\n\n' +
      '⚠️ Укажите <b>#{number}</b> в комментарии к платежу.\n\n' +
      'После перевода нажмите кнопку ниже:',
    ENGLISH:
      '✅ <b>Order #{number} placed!</b>\n\n' +
      'Please transfer <b>{amount}</b> to:\n\n' +
      '<code>{card}</code>\n{name}\n\n' +
      '⚠️ Write <b>#{number}</b> in the payment comment.\n\n' +
      'After transferring, tap the button below:',
  },
  // ── Booking flow ─────────────────────────────────────────────────
  noServices: {
    UZBEK: 'Hozircha xizmatlar mavjud emas.',
    RUSSIAN: 'Пока нет доступных услуг.',
    ENGLISH: 'No services available yet.',
  },
  chooseService: {
    UZBEK: 'Xizmatni tanlang:',
    RUSSIAN: 'Выберите услугу:',
    ENGLISH: 'Choose a service:',
  },
  chooseStaff: {
    UZBEK: 'Mutaxassisni tanlang:',
    RUSSIAN: 'Выберите специалиста:',
    ENGLISH: 'Choose a staff member:',
  },
  anyStaff: {
    UZBEK: 'Farqi yo\'q',
    RUSSIAN: 'Не важно',
    ENGLISH: 'Any available',
  },
  chooseDate: {
    UZBEK: 'Sanani tanlang:',
    RUSSIAN: 'Выберите дату:',
    ENGLISH: 'Choose a date:',
  },
  chooseTime: {
    UZBEK: 'Vaqtni tanlang:',
    RUSSIAN: 'Выберите время:',
    ENGLISH: 'Choose a time:',
  },
  noSlots: {
    UZBEK: 'Bu kunda bo\'sh vaqt yo\'q. Boshqa sanani tanlang.',
    RUSSIAN: 'На этот день нет свободного времени. Выберите другую дату.',
    ENGLISH: 'No available times on this day. Pick another date.',
  },
  slotJustTaken: {
    UZBEK: 'Afsuski, bu vaqt hozirgina band qilindi. Iltimos, boshqa vaqtni tanlang.',
    RUSSIAN: 'К сожалению, это время только что заняли. Пожалуйста, выберите другое.',
    ENGLISH: 'Unfortunately that time was just taken. Please choose another.',
  },
  bookingSummaryTitle: {
    UZBEK: '<b>Navbat xulosasi</b>',
    RUSSIAN: '<b>Сводка записи</b>',
    ENGLISH: '<b>Booking Summary</b>',
  },
  labelService: {
    UZBEK: 'Xizmat',
    RUSSIAN: 'Услуга',
    ENGLISH: 'Service',
  },
  labelStaff: {
    UZBEK: 'Mutaxassis',
    RUSSIAN: 'Специалист',
    ENGLISH: 'Staff',
  },
  labelDate: {
    UZBEK: 'Sana',
    RUSSIAN: 'Дата',
    ENGLISH: 'Date',
  },
  labelTime: {
    UZBEK: 'Vaqt',
    RUSSIAN: 'Время',
    ENGLISH: 'Time',
  },
  confirmBooking: {
    UZBEK: '✅ Navbatni tasdiqlash',
    RUSSIAN: '✅ Подтвердить запись',
    ENGLISH: '✅ Confirm booking',
  },
  bookingCancelled: {
    UZBEK: 'Navbatga yozilish bekor qilindi.',
    RUSSIAN: 'Запись отменена.',
    ENGLISH: 'Booking cancelled.',
  },
  bookingConfirmed: {
    UZBEK: '🎉 <b>Navbatingiz tasdiqlandi!</b>\n\n{service}\n📅 {date} {time} da',
    RUSSIAN: '🎉 <b>Ваша запись подтверждена!</b>\n\n{service}\n📅 {date} в {time}',
    ENGLISH: '🎉 <b>Your appointment is booked!</b>\n\n{service}\n📅 {date} at {time}',
  },
  bookingError: {
    UZBEK: 'Navbatga yozib bo\'lmadi. Qayta urinib ko\'ring.',
    RUSSIAN: 'Не удалось записать. Попробуйте снова.',
    ENGLISH: 'Could not book your appointment. Please try again.',
  },
  payInAdvanceNote: {
    UZBEK: 'Bu xizmat oldindan to\'lovni talab qiladi.',
    RUSSIAN: 'Эта услуга требует предоплаты.',
    ENGLISH: 'This service requires payment in advance.',
  },
  loadingServices: {
    UZBEK: '⏳ Xizmatlar yuklanmoqda...',
    RUSSIAN: '⏳ Загрузка услуг...',
    ENGLISH: '⏳ Loading services...',
  },
  servicesLoadError: {
    UZBEK: 'Xizmatlarni yuklab bo\'lmadi. Keyinroq qayta urinib ko\'ring.',
    RUSSIAN: 'Не удалось загрузить услуги. Попробуйте позже.',
    ENGLISH: 'Could not load services. Please try again later.',
  },
  minShort: {
    UZBEK: 'daq',
    RUSSIAN: 'мин',
    ENGLISH: 'min',
  },
  selected: {
    UZBEK: '✅ {label}: <b>{value}</b>',
    RUSSIAN: '✅ {label}: <b>{value}</b>',
    ENGLISH: '✅ {label}: <b>{value}</b>',
  },
  checkingDates: {
    UZBEK: '⏳ Bo\'sh sanalar tekshirilmoqda...',
    RUSSIAN: '⏳ Проверяем доступные даты...',
    ENGLISH: '⏳ Checking available dates...',
  },
  availabilityLoadError: {
    UZBEK: 'Bo\'sh vaqtlarni yuklab bo\'lmadi. Keyinroq qayta urinib ko\'ring.',
    RUSSIAN: 'Не удалось загрузить доступность. Попробуйте позже.',
    ENGLISH: 'Could not load availability. Please try again later.',
  },
  noSlots14: {
    UZBEK: 'Keyingi 14 kun ichida bo\'sh vaqt yo\'q. Iltimos, biz bilan to\'g\'ridan-to\'g\'ri bog\'laning.',
    RUSSIAN: 'Нет свободного времени в ближайшие 14 дней. Пожалуйста, свяжитесь с нами напрямую.',
    ENGLISH: 'No available slots in the next 14 days. Please contact us directly.',
  },
  slotsLoadError: {
    UZBEK: 'Vaqtlarni yuklab bo\'lmadi. Keyinroq qayta urinib ko\'ring.',
    RUSSIAN: 'Не удалось загрузить время. Попробуйте позже.',
    ENGLISH: 'Could not load time slots. Please try again later.',
  },
  askPhoneShort: {
    UZBEK: 'Telefon raqamingiz?',
    RUSSIAN: 'Ваш номер телефона?',
    ENGLISH: 'Your phone number?',
  },
  labelDuration: {
    UZBEK: 'Davomiyligi',
    RUSSIAN: 'Длительность',
    ENGLISH: 'Duration',
  },
  labelPrice: {
    UZBEK: 'Narx',
    RUSSIAN: 'Цена',
    ENGLISH: 'Price',
  },
  creatingBooking: {
    UZBEK: '⏳ Navbatingiz yaratilmoqda...',
    RUSSIAN: '⏳ Создаём вашу запись...',
    ENGLISH: '⏳ Creating your booking...',
  },
  bookingCreateError: {
    UZBEK: 'Navbatni yaratishda xatolik yuz berdi: {msg}',
    RUSSIAN: 'Произошла ошибка при создании записи: {msg}',
    ENGLISH: 'Something went wrong creating your booking: {msg}',
  },
  bookingSummaryFull: {
    UZBEK:
      '<b>Navbat xulosasi</b>\n\n' +
      '📋 <b>Xizmat:</b> {service}\n' +
      '{staffLine}' +
      '📅 <b>Sana:</b> {date}\n' +
      '🕐 <b>Vaqt:</b> {time}\n' +
      '⏱ <b>Davomiyligi:</b> {duration} daq\n' +
      '💰 <b>Narx:</b> {price}\n\n' +
      '<b>Ism:</b> {name}\n' +
      '<b>Telefon:</b> {phone}',
    RUSSIAN:
      '<b>Сводка записи</b>\n\n' +
      '📋 <b>Услуга:</b> {service}\n' +
      '{staffLine}' +
      '📅 <b>Дата:</b> {date}\n' +
      '🕐 <b>Время:</b> {time}\n' +
      '⏱ <b>Длительность:</b> {duration} мин\n' +
      '💰 <b>Цена:</b> {price}\n\n' +
      '<b>Имя:</b> {name}\n' +
      '<b>Телефон:</b> {phone}',
    ENGLISH:
      '<b>Booking Summary</b>\n\n' +
      '📋 <b>Service:</b> {service}\n' +
      '{staffLine}' +
      '📅 <b>Date:</b> {date}\n' +
      '🕐 <b>Time:</b> {time}\n' +
      '⏱ <b>Duration:</b> {duration} min\n' +
      '💰 <b>Price:</b> {price}\n\n' +
      '<b>Name:</b> {name}\n' +
      '<b>Phone:</b> {phone}',
  },
  bookingStaffLine: {
    UZBEK: '👤 <b>Mutaxassis:</b> {staff}\n',
    RUSSIAN: '👤 <b>Специалист:</b> {staff}\n',
    ENGLISH: '👤 <b>Staff:</b> {staff}\n',
  },
  bookingConfirmedPayment: {
    UZBEK:
      '✅ <b>Navbat tasdiqlandi!</b>\n\n' +
      'Joyingizni saqlab qolish uchun <b>{amount}</b> ni quyidagi kartaga o\'tkazing:\n\n' +
      '<code>{card}</code>\n{name}\n\n' +
      'O\'tkazgandan so\'ng quyidagi tugmani bosing:',
    RUSSIAN:
      '✅ <b>Запись подтверждена!</b>\n\n' +
      'Чтобы закрепить место, переведите <b>{amount}</b> на карту:\n\n' +
      '<code>{card}</code>\n{name}\n\n' +
      'После перевода нажмите кнопку ниже:',
    ENGLISH:
      '✅ <b>Booking confirmed!</b>\n\n' +
      'To secure your spot, please transfer <b>{amount}</b> to:\n\n' +
      '<code>{card}</code>\n{name}\n\n' +
      'After transferring, tap the button below:',
  },
  bookingConfirmedNoPayment: {
    UZBEK:
      '✅ <b>Navbat tasdiqlandi!</b>\n\n' +
      '📋 {service}\n' +
      '📅 {date} {time} da\n' +
      '💰 {price} — navbatda to\'lanadi\n\n' +
      'Sizni kutamiz! Bekor qilish kerak bo\'lsa, navbatdan oldin CANCEL deb yozing.',
    RUSSIAN:
      '✅ <b>Запись подтверждена!</b>\n\n' +
      '📋 {service}\n' +
      '📅 {date} в {time}\n' +
      '💰 {price} — оплата на месте\n\n' +
      'Будем рады вас видеть! Ответьте CANCEL до записи, если нужно отменить.',
    ENGLISH:
      '✅ <b>Booking confirmed!</b>\n\n' +
      '📋 {service}\n' +
      '📅 {date} at {time}\n' +
      '💰 {price} — pay at appointment\n\n' +
      'We look forward to seeing you! Reply CANCEL before your appointment if you need to cancel.',
  },
  // ── Projects ─────────────────────────────────────────────────────
  noProjects: {
    UZBEK: 'Sizda faol loyihalar yo\'q.',
    RUSSIAN: 'У вас нет активных проектов.',
    ENGLISH: 'You have no active projects.',
  },
  projectsLoadError: {
    UZBEK: 'Loyihalarni yuklab bo\'lmadi. Keyinroq qayta urinib ko\'ring.',
    RUSSIAN: 'Не удалось загрузить проекты. Попробуйте позже.',
    ENGLISH: 'Could not load projects. Please try again later.',
  },
  yourProjects: {
    UZBEK: '<b>Loyihalaringiz:</b>',
    RUSSIAN: '<b>Ваши проекты:</b>',
    ENGLISH: '<b>Your projects:</b>',
  },
  labelDeadline: {
    UZBEK: 'Muddat',
    RUSSIAN: 'Срок',
    ENGLISH: 'Deadline',
  },
  labelMilestones: {
    UZBEK: 'Bosqichlar',
    RUSSIAN: 'Этапы',
    ENGLISH: 'Milestones',
  },
  labelInvoices: {
    UZBEK: 'Hisob-fakturalar',
    RUSSIAN: 'Счета',
    ENGLISH: 'Invoices',
  },
  approveMilestone: {
    UZBEK: '✅ Bosqichni ma\'qullash',
    RUSSIAN: '✅ Одобрить этап',
    ENGLISH: '✅ Approve milestone',
  },
  milestoneApproved: {
    UZBEK: '✅ Bosqich ma\'qullandi. Rahmat!',
    RUSSIAN: '✅ Этап одобрен. Спасибо!',
    ENGLISH: '✅ Milestone approved. Thank you!',
  },
  labelStatus: {
    UZBEK: 'Holat',
    RUSSIAN: 'Статус',
    ENGLISH: 'Status',
  },
  labelTotalProject: {
    UZBEK: 'Jami',
    RUSSIAN: 'Итого',
    ENGLISH: 'Total',
  },
  dueShort: {
    UZBEK: 'Muddat {date}',
    RUSSIAN: 'до {date}',
    ENGLISH: 'Due {date}',
  },
  invoiceUnpaidShort: {
    UZBEK: 'To\'lanmagan',
    RUSSIAN: 'Не оплачен',
    ENGLISH: 'Unpaid',
  },
  refreshBtn: {
    UZBEK: '🔄 Yangilash',
    RUSSIAN: '🔄 Обновить',
    ENGLISH: '🔄 Refresh',
  },
  approveBtn: {
    UZBEK: '✅ Ma\'qullash',
    RUSSIAN: '✅ Одобрить',
    ENGLISH: '✅ Approve',
  },
  requestChangesBtn: {
    UZBEK: '🔄 O\'zgartirish so\'rash',
    RUSSIAN: '🔄 Запросить изменения',
    ENGLISH: '🔄 Request changes',
  },
  milestoneApprovedMsg: {
    UZBEK: '✅ Siz <b>{name}</b> bosqichini ma\'qulladingiz. Egasi xabardor qilindi.',
    RUSSIAN: '✅ Вы одобрили этап <b>{name}</b>. Владелец уведомлён.',
    ENGLISH: '✅ You have approved <b>{name}</b>. The owner has been notified.',
  },
  milestoneRejectedMsg: {
    UZBEK: '🔄 <b>{name}</b> uchun o\'zgartirishlar so\'raldi. Egasi xabardor qilindi.',
    RUSSIAN: '🔄 По этапу <b>{name}</b> запрошены изменения. Владелец уведомлён.',
    ENGLISH: '🔄 Changes requested for <b>{name}</b>. The owner has been notified.',
  },
  milestoneApproveError: {
    UZBEK: 'Bosqichni ma\'qullab bo\'lmadi. Qayta urinib ko\'ring.',
    RUSSIAN: 'Не удалось одобрить этап. Попробуйте снова.',
    ENGLISH: 'Could not approve milestone. Please try again.',
  },
  milestoneFeedbackError: {
    UZBEK: 'Fikr-mulohaza yuborib bo\'lmadi. Qayta urinib ko\'ring.',
    RUSSIAN: 'Не удалось отправить отзыв. Попробуйте снова.',
    ENGLISH: 'Could not send feedback. Please try again.',
  },
};

export function t(
  lang: Lang,
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

// ── Status label helpers ───────────────────────────────────────────

export function tOrderStatus(lang: Lang, status: string): string {
  const map: Record<string, Entry> = {
    NEW: { UZBEK: 'Yangi', RUSSIAN: 'Новый', ENGLISH: 'New' },
    PREPARING: { UZBEK: 'Tayyorlanmoqda', RUSSIAN: 'Готовится', ENGLISH: 'Preparing' },
    READY: { UZBEK: 'Tayyor', RUSSIAN: 'Готов', ENGLISH: 'Ready' },
    DELIVERED: { UZBEK: 'Yetkazildi', RUSSIAN: 'Доставлен', ENGLISH: 'Delivered' },
    CANCELLED: { UZBEK: 'Bekor qilindi', RUSSIAN: 'Отменён', ENGLISH: 'Cancelled' },
  };
  return map[status]?.[lang] || status;
}

export function tPaymentStatus(lang: Lang, status: string): string {
  const map: Record<string, Entry> = {
    PENDING: { UZBEK: 'Kutilmoqda', RUSSIAN: 'Ожидает', ENGLISH: 'Pending' },
    PAYMENT_RECEIVED: { UZBEK: 'Qabul qilindi', RUSSIAN: 'Получена', ENGLISH: 'Received' },
    CONFIRMED: { UZBEK: 'Tasdiqlangan', RUSSIAN: 'Подтверждён', ENGLISH: 'Confirmed' },
  };
  return map[status]?.[lang] || status;
}

export function tAppointmentStatus(lang: Lang, status: string): string {
  const map: Record<string, Entry> = {
    REQUESTED: { UZBEK: 'So\'ralgan', RUSSIAN: 'Запрошена', ENGLISH: 'Requested' },
    CONFIRMED: { UZBEK: 'Tasdiqlangan', RUSSIAN: 'Подтверждена', ENGLISH: 'Confirmed' },
    COMPLETED: { UZBEK: 'Yakunlandi', RUSSIAN: 'Завершена', ENGLISH: 'Completed' },
    CANCELLED: { UZBEK: 'Bekor qilindi', RUSSIAN: 'Отменена', ENGLISH: 'Cancelled' },
    NO_SHOW: { UZBEK: 'Kelmadi', RUSSIAN: 'Не пришёл', ENGLISH: 'No-show' },
  };
  return map[status]?.[lang] || status;
}

export function tProjectStatus(lang: Lang, status: string): string {
  const map: Record<string, Entry> = {
    PROPOSAL_SENT: { UZBEK: 'Taklif yuborildi', RUSSIAN: 'Предложение отправлено', ENGLISH: 'Proposal sent' },
    IN_PROGRESS: { UZBEK: 'Jarayonda', RUSSIAN: 'В процессе', ENGLISH: 'In progress' },
    REVIEW: { UZBEK: 'Ko\'rib chiqilmoqda', RUSSIAN: 'На проверке', ENGLISH: 'In review' },
    COMPLETED: { UZBEK: 'Yakunlandi', RUSSIAN: 'Завершён', ENGLISH: 'Completed' },
    CANCELLED: { UZBEK: 'Bekor qilindi', RUSSIAN: 'Отменён', ENGLISH: 'Cancelled' },
  };
  return map[status]?.[lang] || status;
}

export function tMilestoneStatus(lang: Lang, status: string): string {
  const map: Record<string, Entry> = {
    PENDING: { UZBEK: 'Kutilmoqda', RUSSIAN: 'Ожидает', ENGLISH: 'Pending' },
    SUBMITTED_FOR_REVIEW: { UZBEK: 'Ko\'rib chiqishga yuborildi', RUSSIAN: 'Отправлено на проверку', ENGLISH: 'Submitted for review' },
    APPROVED: { UZBEK: 'Ma\'qullangan', RUSSIAN: 'Одобрено', ENGLISH: 'Approved' },
    PAYMENT_RECEIVED: { UZBEK: 'To\'lov qabul qilindi', RUSSIAN: 'Оплата получена', ENGLISH: 'Payment received' },
  };
  return map[status]?.[lang] || status;
}

export function tInvoiceStatus(lang: Lang, status: string): string {
  const map: Record<string, Entry> = {
    UNPAID: { UZBEK: 'To\'lanmagan', RUSSIAN: 'Не оплачен', ENGLISH: 'Unpaid' },
    PAID: { UZBEK: 'To\'langan', RUSSIAN: 'Оплачен', ENGLISH: 'Paid' },
  };
  return map[status]?.[lang] || status;
}

// ── Currency ────────────────────────────────────────────────────────

export function formatMoney(lang: Lang, amount: number): string {
  const num = amount.toLocaleString('en-US').replace(/,/g, ' ');
  const suffix = lang === 'RUSSIAN' ? 'сум' : lang === 'UZBEK' ? "so'm" : 'UZS';
  return `${num} ${suffix}`;
}
