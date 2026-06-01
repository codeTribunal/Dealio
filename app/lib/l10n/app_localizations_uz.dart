// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Uzbek (`uz`).
class AppLocalizationsUz extends AppLocalizations {
  AppLocalizationsUz([String locale = 'uz']) : super(locale);

  @override
  String get appTitle => 'Uzbek CRM';

  @override
  String get buttonSave => 'Saqlash';

  @override
  String get buttonSaveChanges => 'O\'zgarishlarni saqlash';

  @override
  String get buttonCancel => 'Bekor qilish';

  @override
  String get buttonDelete => 'O\'chirish';

  @override
  String get buttonEdit => 'Tahrirlash';

  @override
  String get buttonAdd => 'Qo\'shish';

  @override
  String get buttonCreate => 'Yaratish';

  @override
  String get buttonConfirm => 'Tasdiqlash';

  @override
  String get buttonContinue => 'Davom etish';

  @override
  String get buttonBack => 'Orqaga';

  @override
  String get buttonRetry => 'Qayta urinish';

  @override
  String get buttonClose => 'Yopish';

  @override
  String get buttonDone => 'Tayyor';

  @override
  String get buttonNext => 'Keyingi';

  @override
  String get buttonShare => 'Ulashish';

  @override
  String get buttonCopy => 'Nusxalash';

  @override
  String get commonSearch => 'Qidirish';

  @override
  String get commonLoading => 'Yuklanmoqda';

  @override
  String get commonToday => 'Bugun';

  @override
  String get commonYesterday => 'Kecha';

  @override
  String get commonActive => 'Faol';

  @override
  String get commonPaused => 'To\'xtatilgan';

  @override
  String get commonOptional => 'ixtiyoriy';

  @override
  String get commonOptionalLabel => 'Ixtiyoriy';

  @override
  String get commonRequired => 'Majburiy';

  @override
  String get commonYes => 'Ha';

  @override
  String get commonNo => 'Yo\'q';

  @override
  String get commonAll => 'Hammasi';

  @override
  String get commonNone => 'Yo\'q';

  @override
  String get errorGeneric => 'Nimadir xato ketdi';

  @override
  String get errorLoadFailed => 'Yuklab bo\'lmadi';

  @override
  String errorWithMessage(String message) {
    return 'Xato: $message';
  }

  @override
  String get navHome => 'Bosh sahifa';

  @override
  String get navCustomers => 'Mijozlar';

  @override
  String get navOrders => 'Buyurtmalar';

  @override
  String get navCatalog => 'Katalog';

  @override
  String get navAppointments => 'Navbatlar';

  @override
  String get navServices => 'Xizmatlar';

  @override
  String get navStaff => 'Xodimlar';

  @override
  String get navProjects => 'Loyihalar';

  @override
  String get navAnalytics => 'Tahlil';

  @override
  String get navSettings => 'Sozlamalar';

  @override
  String get navMessages => 'Xabarlar';

  @override
  String get orderStatusNew => 'Yangi';

  @override
  String get orderStatusPreparing => 'Tayyorlanmoqda';

  @override
  String get orderStatusReady => 'Tayyor';

  @override
  String get orderStatusDelivered => 'Yetkazildi';

  @override
  String get orderStatusCancelled => 'Bekor qilindi';

  @override
  String get paymentStatusPending => 'Kutilmoqda';

  @override
  String get paymentStatusPaymentReceived => 'To\'lov qabul qilindi';

  @override
  String get paymentStatusConfirmed => 'Tasdiqlangan';

  @override
  String get appointmentStatusRequested => 'So\'ralgan';

  @override
  String get appointmentStatusConfirmed => 'Tasdiqlangan';

  @override
  String get appointmentStatusCompleted => 'Yakunlandi';

  @override
  String get appointmentStatusCancelled => 'Bekor qilindi';

  @override
  String get appointmentStatusNoShow => 'Kelmadi';

  @override
  String get projectStatusProposalSent => 'Taklif yuborildi';

  @override
  String get projectStatusInProgress => 'Jarayonda';

  @override
  String get projectStatusReview => 'Ko\'rib chiqilmoqda';

  @override
  String get projectStatusCompleted => 'Yakunlandi';

  @override
  String get projectStatusCancelled => 'Bekor qilindi';

  @override
  String get milestoneStatusPending => 'Kutilmoqda';

  @override
  String get milestoneStatusSubmittedForReview => 'Ko\'rib chiqishga yuborildi';

  @override
  String get milestoneStatusApproved => 'Ma\'qullangan';

  @override
  String get milestoneStatusPaymentReceived => 'To\'lov qabul qilindi';

  @override
  String get invoiceStatusUnpaid => 'To\'lanmagan';

  @override
  String get invoiceStatusPaid => 'To\'langan';

  @override
  String get deliveryMethodPickup => 'Olib ketish';

  @override
  String get deliveryMethodDelivery => 'Yetkazib berish';

  @override
  String get loginWelcomeTitle => 'Xush kelibsiz';

  @override
  String get loginWelcomeSubtitle =>
      'Biznesingizni boshqarish uchun tizimga kiring';

  @override
  String get loginPhoneLabel => 'Telefon raqami';

  @override
  String get loginPhoneHint => '90 123 45 67';

  @override
  String get loginContinueButton => 'Davom etish';

  @override
  String get loginOtpHint => 'Raqamingizga 4 xonali kod yuboriladi';

  @override
  String get loginErrorInvalidPhone => 'To\'g\'ri telefon raqamini kiriting';

  @override
  String get otpTitle => 'Kodni kiriting';

  @override
  String otpSubtitle(String phone) {
    return '$phone raqamiga kod yubordik';
  }

  @override
  String get otpCodeLabel => 'Tasdiqlash kodi';

  @override
  String get otpVerifyButton => 'Tasdiqlash';

  @override
  String get otpResendButton => 'Kodni qayta yuborish';

  @override
  String get otpCodeResent => 'Kod qayta yuborildi';

  @override
  String get otpDevHint => 'Sinov rejimida 1234 dan foydalaning';

  @override
  String get otpErrorInvalid => 'Kod noto\'g\'ri, qayta urinib ko\'ring';

  @override
  String get consentGeneral =>
      'Men Maxfiylik siyosati bilan tanishdim va O\'zbekiston Respublikasining \"Shaxsga doir ma\'lumotlar to\'g\'risida\"gi qonuniga muvofiq shaxsiy ma\'lumotlarim qayta ishlanishiga roziman.';

  @override
  String get consentGeneralLink => 'Maxfiylik siyosati';

  @override
  String get consentCrossBorder =>
      'Shaxsiy ma\'lumotlarim O\'zbekistondan tashqarida joylashgan serverlarda (Railway, Cloudflare) saqlanishiga va uzatilishiga roziman.';

  @override
  String get onboardingBusinessStepTitle =>
      'Biznesingiz haqida ma\'lumot bering';

  @override
  String get onboardingBusinessNameLabel => 'Biznes nomi';

  @override
  String get onboardingBusinessNameHint => 'masalan, Laylo Cakes';

  @override
  String get onboardingModeTitle => 'Biznesingiz nima bilan shug\'ullanadi?';

  @override
  String get onboardingModeProducts => 'Mahsulot sotish';

  @override
  String get onboardingModeProductsDesc =>
      'Tortlar, kiyimlar, qo\'lda yasalgan buyumlar';

  @override
  String get onboardingModeServices => 'Xizmat ko\'rsatish';

  @override
  String get onboardingModeServicesDesc => 'Salon, repetitorlik, navbatlar';

  @override
  String get onboardingModeFreelance => 'Frilans loyihalar';

  @override
  String get onboardingModeFreelanceDesc => 'Dizayn, video, dasturlash';

  @override
  String get onboardingBotStepTitle => 'Telegram botingizni ulang';

  @override
  String get onboardingBotTokenLabel => 'Bot tokeni';

  @override
  String get onboardingBotTokenHint =>
      'BotFather\'dan olingan tokenni joylashtiring';

  @override
  String get onboardingPaymentStepTitle => 'Mijozlar qanday to\'laydi?';

  @override
  String get onboardingReviewStepTitle => 'Ko\'rib chiqish';

  @override
  String get onboardingDoneTitle => 'Hammasi tayyor!';

  @override
  String get onboardingDoneSubtitle =>
      'Biznesingiz buyurtmalarni qabul qilishga tayyor';

  @override
  String get onboardingDoneShareHint =>
      'CRM tayyor. Bot havolangizni mijozlar bilan ulashing.';

  @override
  String get onboardingFinishButton => 'Boshqaruv paneliga o\'tish';

  @override
  String get onboardingSetupTitle => 'Biznesingizni sozlang';

  @override
  String get onboardingBusinessType => 'Biznes turi';

  @override
  String get onboardingLanguageLabel => 'Til';

  @override
  String get onboardingModeProductsTitle => 'Mahsulot sotish';

  @override
  String get onboardingModeProductsSubtitle => 'Telegram bot orqali sotish';

  @override
  String get onboardingModeServicesTitle => 'Xizmatlar va navbatlar';

  @override
  String get onboardingModeServicesSubtitle => 'Bronlarni qabul qilish';

  @override
  String get onboardingModeFreelanceTitle => 'Frilans loyihalar';

  @override
  String get onboardingModeFreelanceSubtitle =>
      'Loyihalar va hisob-fakturalarni kuzatish';

  @override
  String get onboardingModeFreelanceShort => 'Frilans';

  @override
  String get onboardingBotHeader => 'Telegram bot';

  @override
  String get onboardingBotCreateTitle => 'Telegram botingizni yarating';

  @override
  String get onboardingBotCreateSubtitle =>
      'Mijozlaringiz ushbu botdan foydalanadi';

  @override
  String get onboardingBotStep1 =>
      'Telegramni oching va @BotFather\'ni qidiring';

  @override
  String get onboardingBotStep2 => 'Quyidagi xabarni yuboring: /newbot';

  @override
  String get onboardingBotStep3 =>
      'Botingiz uchun nom tanlang (masalan, Zulfiya Cakes)';

  @override
  String get onboardingBotStep4 =>
      '_bot bilan tugaydigan foydalanuvchi nomini tanlang (masalan, zulfiya_cakes_bot)';

  @override
  String get onboardingBotStep5 => 'BotFather bergan tokenni nusxalang';

  @override
  String get onboardingBotPasteToken => 'Bot tokeningizni joylashtiring';

  @override
  String get onboardingVerifyToken => 'Tokenni tekshirish';

  @override
  String onboardingBotReady(String username) {
    return '@$username tayyor!';
  }

  @override
  String get onboardingPaymentHeader => 'To\'lov usuli';

  @override
  String get onboardingPaymentSubtitle =>
      'Buni keyinroq Sozlamalarda o\'zgartirishingiz mumkin';

  @override
  String onboardingCardNumberLabel(String optional) {
    return 'Karta raqami ($optional)';
  }

  @override
  String get onboardingSkipForNow => 'Hozircha o\'tkazib yuborish';

  @override
  String get onboardingAlmostDone => 'Deyarli tayyor!';

  @override
  String get onboardingSummaryType => 'Turi';

  @override
  String get onboardingSummaryBot => 'Bot';

  @override
  String get onboardingSummaryPayment => 'To\'lov';

  @override
  String get onboardingNotSet => 'Belgilanmagan';

  @override
  String get onboardingLaunchCrm => 'CRM\'ni ishga tushirish';

  @override
  String get settingsTitle => 'Sozlamalar';

  @override
  String get settingsBusinessProfile => 'BIZNES PROFILI';

  @override
  String get settingsEditProfileTooltip => 'Profilni tahrirlash';

  @override
  String settingsDescriptionLabel(String optional) {
    return 'Tavsif ($optional)';
  }

  @override
  String get settingsBusinessMode => 'BIZNES TURI';

  @override
  String get settingsModeProductsLabel => 'Mahsulot sotish';

  @override
  String get settingsModeProductsDesc =>
      'Bot orqali jismoniy yoki raqamli mahsulotlarni sotish';

  @override
  String get settingsModeServicesLabel => 'Xizmat / navbatlar';

  @override
  String get settingsModeServicesDesc =>
      'Bron qabul qilish va navbatlarni boshqarish';

  @override
  String get settingsModeFreelanceLabel => 'Frilans / loyihalar';

  @override
  String get settingsModeFreelanceDesc =>
      'Loyiha bosqichlari va hisob-fakturalarni kuzatish';

  @override
  String get settingsModeAtLeastOne => 'Kamida bitta tur faol bo\'lishi kerak.';

  @override
  String get settingsPaymentMethod => 'TO\'LOV USULI';

  @override
  String get settingsEditPaymentTooltip => 'To\'lovni tahrirlash';

  @override
  String get settingsCardNumberLabel => 'Karta raqami';

  @override
  String get settingsNoCardWarning =>
      'To\'lov kartasi belgilanmagan. Mijozlar to\'lov qila olmaydi.';

  @override
  String get settingsCalendarSync => 'TAQVIM SINXRONIZATSIYASI';

  @override
  String get settingsCalendarSyncTitle => 'Taqvimimga sinxronlash';

  @override
  String get settingsCalendarSyncSubtitle =>
      'Navbatlar, yetkazib berishlar va muddatlarni taqvimingizga qo\'shing';

  @override
  String get settingsCalendarLinkLabel => 'Taqvim havolangiz';

  @override
  String get settingsCalendarLinkCopied => 'Taqvim havolasi nusxalandi';

  @override
  String get settingsCalendarSyncFailed =>
      'Taqvim sinxronizatsiyasini yangilab bo\'lmadi';

  @override
  String get settingsAddToGoogleCalendar => 'Google Calendar\'ga qo\'shish';

  @override
  String get settingsAddToAppleCalendar => 'Apple Calendar\'ga qo\'shish';

  @override
  String get settingsCalendarSamsungNote =>
      'Samsung foydalanuvchilari: Google Calendar\'ga qo\'shing — u avtomatik ravishda Samsung Calendar bilan sinxronlanadi.';

  @override
  String get settingsReminders => 'ESLATMALAR';

  @override
  String get settingsRemindersSubtitle =>
      'Navbatlar, yetkazib berishlar va muddatlardan oldin xabardor bo\'ling';

  @override
  String get settingsReminderSaveFailed =>
      'Eslatma sozlamasini saqlab bo\'lmadi';

  @override
  String get settingsRemindersLoadFailed =>
      'Eslatma sozlamalarini yuklab bo\'lmadi';

  @override
  String get settingsReminderAppointmentTitle => 'Navbat eslatmalari';

  @override
  String get settingsReminderAppointmentSubtitle => 'Har bir navbatdan oldin';

  @override
  String get settingsReminderSecondTitle => 'Ikkinchi eslatma';

  @override
  String get settingsReminderSecondSubtitle =>
      'Vaqtga yaqinroq yakuniy eslatma';

  @override
  String get settingsReminderDeliveryTitle => 'Yetkazib berish eslatmalari';

  @override
  String get settingsReminderDeliverySubtitle =>
      'Buyurtma yetkazib berilishidan oldin';

  @override
  String get settingsReminderDeadlineTitle => 'Muddat eslatmalari';

  @override
  String get settingsReminderDeadlineSubtitle =>
      'Bosqichlar va loyiha muddatlaridan oldin';

  @override
  String settingsReminderHoursBefore(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count soat oldin',
      one: '1 soat oldin',
    );
    return '$_temp0';
  }

  @override
  String settingsReminderDaysBefore(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count kun oldin',
      one: '1 kun oldin',
    );
    return '$_temp0';
  }

  @override
  String get settingsRemindersFootnote =>
      'Eslatmalar ushbu ilovaga va Telegramingizga yuboriladi.';

  @override
  String get settingsTelegramBot => 'TELEGRAM BOT';

  @override
  String get settingsNoBotConfigured =>
      'Bot sozlanmagan. Botni sozlash uchun qo\'llab-quvvatlash xizmatiga murojaat qiling.';

  @override
  String get settingsCopyLinkTooltip => 'Havolani nusxalash';

  @override
  String get settingsBotLinkCopied => 'Bot havolasi nusxalandi';

  @override
  String get settingsLanguage => 'TIL';

  @override
  String get settingsLanguageFootnote =>
      'Bu ilova tilini va Telegram botingiz mijozlar bilan ishlatadigan tilni o\'zgartiradi.';

  @override
  String get settingsAccount => 'HISOB';

  @override
  String get settingsLogOut => 'Chiqish';

  @override
  String get settingsCustomerFields => 'MIJOZ MAYDONLARI';

  @override
  String get settingsAddFieldTooltip => 'Maydon qo\'shish';

  @override
  String get settingsNoCustomFields =>
      'Maxsus maydonlar yo\'q. Mijozlar haqida qo\'shimcha ma\'lumot to\'plash uchun maydon qo\'shing.';

  @override
  String get settingsAddCustomerField => 'Mijoz maydonini qo\'shish';

  @override
  String get settingsFieldNameLabel => 'Maydon nomi';

  @override
  String get settingsFieldNameHint => 'masalan, Kompaniya, Instagram manzili';

  @override
  String get settingsFieldTypeLabel => 'Maydon turi';

  @override
  String get settingsFieldTypeText => 'Matn';

  @override
  String get settingsFieldTypeNumber => 'Raqam';

  @override
  String get settingsFieldTypeDate => 'Sana';

  @override
  String get settingsFieldTypeYesNo => 'Ha / Yo\'q';

  @override
  String get settingsPipelineStages => 'VORONKA BOSQICHLARI';

  @override
  String get settingsAddStageTooltip => 'Bosqich qo\'shish';

  @override
  String get settingsNoStages =>
      'Voronka bosqichlari yo\'q. Mijozlar savdo jarayonining qaysi bosqichida ekanini kuzatish uchun bosqich qo\'shing.';

  @override
  String get settingsAddStage => 'Voronka bosqichini qo\'shish';

  @override
  String get settingsStageNameLabel => 'Bosqich nomi';

  @override
  String get settingsStageNameHint =>
      'masalan, Potensial mijoz, Muzokara, Yakunlangan';

  @override
  String get settingsColorLabel => 'Rang';

  @override
  String get settingsCheckoutQuestions => 'BUYURTMA SAVOLLARI';

  @override
  String get settingsAddQuestionTooltip => 'Savol qo\'shish';

  @override
  String get settingsNoCheckoutQuestions =>
      'Buyurtma savollari yo\'q. Savollar Telegram botda buyurtma berish vaqtida so\'raladi.';

  @override
  String get settingsAddCheckoutQuestion => 'Buyurtma savolini qo\'shish';

  @override
  String get settingsQuestionLabel => 'Savol';

  @override
  String get settingsQuestionHint =>
      'masalan, Allergiya yoki maxsus talablar bormi?';

  @override
  String get settingsServices => 'XIZMATLAR';

  @override
  String get settingsManageServices => 'Xizmatlarni boshqarish';

  @override
  String get settingsStaff => 'XODIMLAR';

  @override
  String get settingsManageStaff => 'Xodimlarni boshqarish';

  @override
  String get homeSearchHint => 'Mijozlarni qidirish...';

  @override
  String get homeNoCustomersFound => 'Mijozlar topilmadi';

  @override
  String get homeNoContactInfo => 'Aloqa ma\'lumoti yo\'q';

  @override
  String homeOrdersCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ta buyurtma',
      one: '1 ta buyurtma',
    );
    return '$_temp0';
  }

  @override
  String get homeNeedsAttention => 'E\'tibor talab qiladi';

  @override
  String get homeTodaysActivity => 'Bugungi faoliyat';

  @override
  String get homeOverdue => 'Muddati o\'tgan';

  @override
  String homeDaysSilent(int days) {
    return '$days kun jim';
  }

  @override
  String get homeBadgeAppointment => 'Navbat';

  @override
  String get homeBadgeProject => 'Loyiha';

  @override
  String get homeBadgeMilestone => 'Bosqich';

  @override
  String homeActivityCancelled(String service) {
    return '$service — bekor qilindi';
  }

  @override
  String homeActivityNewProject(String customer) {
    return 'Yangi loyiha • $customer';
  }

  @override
  String homeActivityMilestoneApproved(String project) {
    return 'Ma\'qullandi • $project';
  }

  @override
  String get homeNoActivity => 'Bugun faoliyat yo\'q';

  @override
  String get homeWelcome => 'Assalomu alaykum';

  @override
  String get homeHeroTodayOrders => 'Bugungi buyurtmalar';

  @override
  String get homeStatPending => 'Kutilayotgan to\'lovlar';

  @override
  String get homeStatNewCustomers => 'Yangi mijozlar';

  @override
  String homePendingPaymentsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ta to\'lov kutilmoqda',
      one: '1 ta to\'lov kutilmoqda',
      zero: 'To\'lov kutilmayapti',
    );
    return '$_temp0';
  }

  @override
  String get ordersTitle => 'Buyurtmalar';

  @override
  String get ordersSearchHint => 'Ism yoki buyurtma № bo\'yicha qidirish';

  @override
  String orderNumberLabel(int number) {
    return 'Buyurtma №$number';
  }

  @override
  String get orderPaidBadge => '💰 To\'landi';

  @override
  String get ordersEmpty => 'Hali buyurtmalar yo\'q';

  @override
  String get ordersEmptyFiltered => 'Filtringizga mos buyurtma yo\'q';

  @override
  String get commonTotal => 'Jami';

  @override
  String get orderDetailTitle => 'Buyurtma';

  @override
  String get orderPaymentPaid => 'To\'langan';

  @override
  String get orderPaymentPending => 'To\'lov kutilmoqda';

  @override
  String get orderSectionCustomer => 'Mijoz';

  @override
  String get orderSectionItems => 'Mahsulotlar';

  @override
  String get orderSectionDelivery => 'Yetkazib berish';

  @override
  String get orderSectionNotes => 'Izohlar';

  @override
  String get orderSectionResponses => 'Mijoz javoblari';

  @override
  String get orderSectionTimeline => 'Vaqt jadvali';

  @override
  String get orderTimelinePlaced => 'Buyurtma berildi';

  @override
  String get orderTimelineReady => 'Olib ketish / yetkazib berishga tayyor';

  @override
  String get orderTimelinePaymentConfirmed => 'To\'lov tasdiqlandi';

  @override
  String get orderConfirmPayment => 'To\'lovni tasdiqlash';

  @override
  String get orderStartPreparing => 'Tayyorlashni boshlash';

  @override
  String get orderMarkReady => 'Tayyor deb belgilash';

  @override
  String get orderMarkDelivered => 'Yetkazildi deb belgilash';

  @override
  String get orderCancel => 'Buyurtmani bekor qilish';

  @override
  String get orderPaymentAlreadyConfirmed => 'To\'lov allaqachon tasdiqlangan';

  @override
  String get orderCancelTitle => 'Buyurtma bekor qilinsinmi?';

  @override
  String get orderCancelConfirm => 'Bu amalni qaytarib bo\'lmaydi.';

  @override
  String get orderKeep => 'Qoldirish';

  @override
  String get customersTitle => 'Mijozlar';

  @override
  String get customersSearchHint =>
      'Ism, @handle yoki telefon bo\'yicha qidirish';

  @override
  String get customersEmpty => 'Hali mijozlar yo\'q';

  @override
  String get customersEmptyFiltered => 'Qidiruvingizga mos mijoz yo\'q';

  @override
  String get customersEmptyHint =>
      'Mijozlar bot orqali buyurtma berganda qo\'shiladi';

  @override
  String get customerDetailTitle => 'Mijoz';

  @override
  String get customerAddTag => 'Teg qo\'shish';

  @override
  String get customerTagHint => 'Teg nomi (masalan, VIP, Tort ishqibozi)';

  @override
  String get customerSetStage => 'Voronka bosqichini belgilash';

  @override
  String get customerNoStage => 'Bosqichsiz';

  @override
  String get customerSetStageShort => 'Bosqichni belgilash';

  @override
  String customerSince(String date) {
    return '$date dan beri';
  }

  @override
  String get customerStatOrders => 'Buyurtmalar';

  @override
  String get customerStatTotalSpent => 'Jami sarflangan';

  @override
  String get customerStatLastOrder => 'Oxirgi buyurtma';

  @override
  String customerDaysAgo(int days) {
    return '$days kun oldin';
  }

  @override
  String get customerAddReminder => 'Eslatma qo\'shish';

  @override
  String get customerReminderHint =>
      'Izoh (masalan, №12 buyurtma bo\'yicha bog\'lanish)';

  @override
  String get customerSaveReminder => 'Eslatmani saqlash';

  @override
  String get customerNoReminders =>
      'Eslatmalar yo\'q. Qo\'shish uchun + ni bosing.';

  @override
  String get customerNotesLabel => 'IZOHLAR';

  @override
  String get customerNotesHint => 'Ushbu mijoz haqida izohlar qo\'shing…';

  @override
  String get customerNoNotes =>
      'Hali izohlar yo\'q. Qo\'shish uchun tahrirlashni bosing.';

  @override
  String get customerCustomFields => 'MAXSUS MAYDONLAR';

  @override
  String get customerNoCustomFields =>
      'Maxsus maydonlar aniqlanmagan. Sozlamalarda maydon qo\'shing.';

  @override
  String get customerTapToSet => 'Belgilash uchun bosing';

  @override
  String get customerOrderHistory => 'BUYURTMALAR TARIXI';

  @override
  String get customerLoadError => 'Mijozni yuklab bo\'lmadi';

  @override
  String get customerLoadErrorHint =>
      'Internet aloqasini tekshiring va qayta urinib ko\'ring';

  @override
  String get catalogTitle => 'Katalog';

  @override
  String catalogPrepTime(String time) {
    return 'Tayyorlash: $time';
  }

  @override
  String get catalogEmpty => 'Hali mahsulotlar yo\'q';

  @override
  String get catalogEmptyHint =>
      'Birinchi mahsulotingizni qo\'shish uchun + ni bosing';

  @override
  String get stockUnlimited => 'Cheksiz';

  @override
  String get stockNoInfo => 'Zaxira ma\'lumoti yo\'q';

  @override
  String get stockOut => 'Tugagan';

  @override
  String stockIn(int count) {
    return 'Zaxirada: $count';
  }

  @override
  String get productFormNewTitle => 'Yangi mahsulot';

  @override
  String get productFormEditTitle => 'Mahsulotni tahrirlash';

  @override
  String get productFormNameLabel => 'Mahsulot nomi *';

  @override
  String get productFormNameHint => 'masalan, Shokoladli tort';

  @override
  String get productFormNameRequired => 'Nom kiritilishi shart';

  @override
  String get productFormPriceLabel => 'Narx *';

  @override
  String get productFormPriceRequired => 'Narx kiritilishi shart';

  @override
  String get productFormPriceInvalid => 'To\'g\'ri narx kiriting';

  @override
  String get productFormDescLabel => 'Tavsif';

  @override
  String get productFormDescHint => 'Ixtiyoriy mahsulot tavsifi';

  @override
  String get productFormStockLabel => 'Zaxira miqdori';

  @override
  String get productFormStockHint => 'masalan, 10';

  @override
  String get productFormStockInvalid => '0 yoki undan ko\'p kiriting';

  @override
  String get productFormTimeLabel => 'Vaqt';

  @override
  String get productFormUnitLabel => 'Birlik';

  @override
  String get prepUnitMinutes => 'Daqiqa';

  @override
  String get prepUnitHours => 'Soat';

  @override
  String get prepUnitDays => 'Kun';

  @override
  String get prepUnitWeeks => 'Hafta';

  @override
  String get productFormActiveOn => 'Mahsulot bot katalogida ko\'rinadi';

  @override
  String get productFormActiveOff => 'Mahsulot mijozlardan yashirilgan';

  @override
  String get productFormCreate => 'Mahsulot yaratish';

  @override
  String get formRequired => 'Majburiy';

  @override
  String get formPositiveInteger => 'Musbat butun son kiriting';

  @override
  String durationMinutes(int min) {
    return '$min daqiqa';
  }

  @override
  String get servicesTitle => 'Xizmatlar';

  @override
  String get servicesEmpty =>
      'Hali xizmatlar yo\'q. Qo\'shish uchun + ni bosing.';

  @override
  String get serviceFormNewTitle => 'Yangi xizmat';

  @override
  String get serviceFormEditTitle => 'Xizmatni tahrirlash';

  @override
  String get serviceFormNameLabel => 'Xizmat nomi';

  @override
  String get serviceFormDurationLabel => 'Davomiyligi (daqiqa)';

  @override
  String get serviceFormPriceLabel => 'Narx (so\'m)';

  @override
  String get serviceFormActiveSubtitle => 'Botda mijozlarga ko\'rinadi';

  @override
  String get staffTitle => 'Xodimlar';

  @override
  String get staffEmpty => 'Hali xodimlar yo\'q. Qo\'shish uchun + ni bosing.';

  @override
  String get staffNoServices => 'Xizmatlar biriktirilmagan';

  @override
  String get staffFormNewTitle => 'Yangi xodim';

  @override
  String get staffFormEditTitle => 'Xodimni tahrirlash';

  @override
  String staffDeleteTitle(String name) {
    return '$name o\'chirilsinmi?';
  }

  @override
  String get staffThisMember => 'bu xodim';

  @override
  String get staffDeleteConfirm => 'Buni qaytarib bo\'lmaydi.';

  @override
  String get staffFormNameLabel => 'To\'liq ism';

  @override
  String get staffFormTelegramLabel => 'Telegram manzili (ixtiyoriy)';

  @override
  String get staffFormServicesLabel => 'Bajariladigan xizmatlar';

  @override
  String get staffNoServicesAvailable =>
      'Mavjud xizmatlar yo\'q. Avval xizmat qo\'shing.';

  @override
  String get staffSelectService => 'Kamida bitta xizmatni tanlang';

  @override
  String get appointmentsTitle => 'Navbatlar';

  @override
  String get apptTomorrow => 'Ertaga';

  @override
  String get apptEmpty => 'Bu kuni navbatlar yo\'q';

  @override
  String get apptEmptyHint => 'Qo\'shish uchun + tugmasidan foydalaning';

  @override
  String get apptDetailTitle => 'Navbat';

  @override
  String get apptPayInAdvance => 'Oldindan to\'lash';

  @override
  String get apptPayAtAppointment => 'Navbatda to\'lash';

  @override
  String get apptNotesHint => 'Izoh qo\'shing…';

  @override
  String get apptNoNotes => 'Izohlar yo\'q';

  @override
  String get apptConfirmPayment => 'To\'lov qabul qilinganini tasdiqlash';

  @override
  String get apptConfirm => 'Navbatni tasdiqlash';

  @override
  String get apptMarkCompleted => 'Yakunlangan deb belgilash';

  @override
  String get apptMarkNoShow => 'Kelmagan deb belgilash';

  @override
  String get apptCancel => 'Navbatni bekor qilish';

  @override
  String get apptFormTitle => 'Yangi navbat';

  @override
  String get apptFormCustomerLabel => 'Mijoz *';

  @override
  String get apptFormSelectExisting => 'Mavjudini tanlash';

  @override
  String get apptFormEnterManually => 'Qo\'lda kiritish';

  @override
  String get apptFormSelectCustomer => 'Mijozni tanlang';

  @override
  String get apptFormCustomerNameLabel => 'Mijoz ismi';

  @override
  String get apptFormCustomerNameHint => 'Mijoz ismini kiriting';

  @override
  String get apptFormServiceLabel => 'Xizmat *';

  @override
  String get apptFormFromServices => 'Xizmatlarimdan';

  @override
  String get apptFormServiceField => 'Xizmat';

  @override
  String get apptFormSelectService => 'Xizmatni tanlang';

  @override
  String get apptFormServiceNameHint => 'masalan, Soch olish, Maslahat, Dars';

  @override
  String get apptFormDurationLabel => 'Davomiyligi (daq)';

  @override
  String get apptFormStaffLabel => 'Xodim';

  @override
  String get apptFormAnyStaff => 'Har qanday mavjud';

  @override
  String get apptFormWhenLabel => 'Qachon *';

  @override
  String get apptFormDateLabel => 'Sana';

  @override
  String get apptFormSelectDate => 'Sanani tanlang';

  @override
  String get apptFormSelectTime => 'Vaqtni tanlang';

  @override
  String get apptFormPaymentLabel => 'To\'lov';

  @override
  String get apptFormNotesHint => 'Ushbu navbat haqida izohlar...';

  @override
  String get apptFormCreate => 'Navbat yaratish';

  @override
  String get apptErrSelectCustomer => 'Mijozni tanlang';

  @override
  String get apptErrEnterCustomer => 'Mijoz ismini kiriting';

  @override
  String get apptErrSelectService => 'Xizmatni tanlang';

  @override
  String get apptErrEnterService => 'Xizmat nomini kiriting';

  @override
  String get apptErrSelectDateTime => 'Sana va vaqtni tanlang';

  @override
  String get projectsTitle => 'Loyihalar';

  @override
  String get projectsFilterProposal => 'Taklif';

  @override
  String get projectsFilterReview => 'Ko\'rib chiqish';

  @override
  String get projectsEmpty => 'Hali loyihalar yo\'q';

  @override
  String projectsMilestoneCount(int done, int total) {
    return '$done/$total bosqich';
  }

  @override
  String get projectDetailTitle => 'Loyiha';

  @override
  String get projectMarkInProgress => 'Jarayonda deb belgilash';

  @override
  String get projectSendForReview => 'Ko\'rib chiqishga yuborish';

  @override
  String get projectMarkCompleted => 'Yakunlangan deb belgilash';

  @override
  String get projectCancelProject => 'Loyihani bekor qilish';

  @override
  String projectStatusUpdated(String status) {
    return 'Holat yangilandi: $status';
  }

  @override
  String get projectClient => 'Mijoz';

  @override
  String get projectPhone => 'Telefon';

  @override
  String get projectStart => 'Boshlanishi';

  @override
  String get projectDeadline => 'Muddat';

  @override
  String get projectScope => 'Ish hajmi';

  @override
  String get projectPaymentTerms => 'To\'lov shartlari';

  @override
  String get projectProposalCopied => 'Taklif havolasi nusxalandi';

  @override
  String get projectShareProposal => 'Taklif havolasini ulashish';

  @override
  String get projectMilestones => 'Bosqichlar';

  @override
  String get projectNoMilestones => 'Hali bosqichlar yo\'q';

  @override
  String get milestoneAwaitingReview => 'Mijoz ko\'rib chiqishini kutmoqda';

  @override
  String get milestoneApprovedByClient => 'Mijoz tomonidan ma\'qullangan';

  @override
  String projectDuePrefix(String date) {
    return 'Muddat: $date';
  }

  @override
  String get projectResetMilestone => 'Bosqichni qayta tiklash';

  @override
  String projectResetMilestoneBody(String name) {
    return '\"$name\" bosqichi qayta Kutilmoqda holatiga qaytarilsinmi?\n\nBu sinov uchun — mijoz xabardor qilinmaydi.';
  }

  @override
  String get projectResetToPending => 'Kutilmoqdaga qaytarish';

  @override
  String get projectSubmitForReview => 'Mijoz ko\'rib chiqishiga yuborish';

  @override
  String get projectWaitingApproval => 'Mijoz tasdig\'i kutilmoqda';

  @override
  String get projectMarkPaymentReceived =>
      'To\'lov qabul qilindi deb belgilash';

  @override
  String get projectInvoices => 'Hisob-fakturalar';

  @override
  String get projectGenerate => 'Yaratish';

  @override
  String get projectNoInvoices => 'Hali hisob-fakturalar yo\'q';

  @override
  String get projectInvoiceCopied => 'Hisob-faktura havolasi nusxalandi';

  @override
  String get projectMarkPaid => 'To\'langan deb belgilash';

  @override
  String get projectGenerateInvoice => 'Hisob-faktura yaratish';

  @override
  String get projectQty => 'Soni';

  @override
  String get projectUnitPrice => 'Birlik narxi (so\'m)';

  @override
  String get projectDueDateLabel => 'Muddat (YYYY-MM-DD)';

  @override
  String get projectFormTitle => 'Yangi loyiha';

  @override
  String get projectSelectClient => 'Mijozni tanlang';

  @override
  String get projectClientNameLabel => 'Mijoz ismi';

  @override
  String get projectClientNameHint => 'Mijoz ismini kiriting';

  @override
  String get projectNameLabel => 'Loyiha nomi';

  @override
  String get projectNameHint =>
      'masalan, Brend identifikatsiyasini qayta ishlash';

  @override
  String get projectScopeHint =>
      'Yetkazib beriladigan natijalarni tasvirlang...';

  @override
  String get projectPriceLabel => 'Kelishilgan umumiy narx (so\'m)';

  @override
  String get projectTermsHint => 'masalan, 50% oldindan, 50% yetkazib berishda';

  @override
  String get projectStartDate => 'Boshlanish sanasi';

  @override
  String get projectFormCreate => 'Loyiha yaratish';

  @override
  String get projectErrSelectClient => 'Iltimos, mijozni tanlang';

  @override
  String get projectErrEnterClient => 'Mijoz ismini kiriting';

  @override
  String get projectErrNameRequired => 'Loyiha nomi kiritilishi shart';

  @override
  String get milestoneFormTitle => 'Bosqich qo\'shish';

  @override
  String get milestoneAdd => 'Bosqich qo\'shish';

  @override
  String get milestoneNameLabel => 'Bosqich nomi';

  @override
  String get milestoneNameHint => 'masalan, Dastlabki dizayn maketlari';

  @override
  String get milestoneAmountLabel => 'Summa (so\'m)';

  @override
  String get milestoneDueDateLabel => 'Muddat';

  @override
  String get milestoneAmountInvalid => 'To\'g\'ri summa kiriting';

  @override
  String get analyticsTitle => 'Tahlil';

  @override
  String get analyticsNoDataLastMonth => 'O\'tgan oy uchun ma\'lumot yo\'q';

  @override
  String analyticsVsLastMonth(String change) {
    return 'O\'tgan oyga nisbatan $change%';
  }

  @override
  String get analyticsRevenueThisMonth => 'Bu oylik daromad';

  @override
  String analyticsLastMonth(String amount) {
    return 'O\'tgan oy: $amount';
  }

  @override
  String get analyticsCompletedThisMonth => 'Bu oy\nyakunlangan';

  @override
  String get analyticsAvgOrderValue => 'O\'rtacha\nbuyurtma';

  @override
  String get analyticsPendingPayments => 'Kutilayotgan to\'lovlar';

  @override
  String get analyticsAllReceived => 'Barcha to\'lovlar qabul qilindi';

  @override
  String get analyticsTopCustomers => 'ENG YAXSHI MIJOZLAR — SO\'NGGI 90 KUN';

  @override
  String get analyticsNoConfirmedOrders =>
      'So\'nggi 90 kunda tasdiqlangan buyurtmalar yo\'q';

  @override
  String get analyticsBestSelling => 'ENG KO\'P SOTILGAN MAHSULOT';

  @override
  String analyticsUnitsSold(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count dona sotilgan',
      one: '1 dona sotilgan',
    );
    return '$_temp0';
  }

  @override
  String get schedulingWorkingHours => 'Ish vaqti';

  @override
  String get schedulingWorkingHoursHint =>
      'Mijozlar qachon yozila oladi. Vaqt Toshkent vaqti bilan, 24 soatlik.';

  @override
  String get schedulingOpen => 'Ochiq';

  @override
  String get schedulingClosed => 'Yopiq';

  @override
  String get schedulingDayMon => 'Dushanba';

  @override
  String get schedulingDayTue => 'Seshanba';

  @override
  String get schedulingDayWed => 'Chorshanba';

  @override
  String get schedulingDayThu => 'Payshanba';

  @override
  String get schedulingDayFri => 'Juma';

  @override
  String get schedulingDaySat => 'Shanba';

  @override
  String get schedulingDaySun => 'Yakshanba';

  @override
  String get schedulingStart => 'Boshlanishi';

  @override
  String get schedulingEnd => 'Tugashi';

  @override
  String get schedulingTimeInvalid =>
      'Boshlanish vaqti tugash vaqtidan oldin bo‘lishi kerak.';

  @override
  String get schedulingBuffer => 'Navbatlar orasidagi tanaffus';

  @override
  String get schedulingBufferHint =>
      'Har bir navbatdan keyin qo‘shiladigan tanaffus, masalan tozalash uchun.';

  @override
  String get schedulingBufferUnit => 'daqiqa';

  @override
  String get schedulingWorkingHoursSaved => 'Ish vaqti saqlandi';

  @override
  String get schedulingBlockedTime => 'Band qilingan vaqt';

  @override
  String get schedulingBlockedTimeHint =>
      'Ta’til, tanaffus yoki bir martalik yopilishlarni band qiling, shunda mijozlar yozila olmaydi.';

  @override
  String get schedulingAddBlocked => 'Band vaqt qo‘shish';

  @override
  String get schedulingNoBlocked => 'Band qilingan vaqt yo‘q';

  @override
  String get schedulingScope => 'Kimga tegishli';

  @override
  String get schedulingWholeBusiness => 'Butun biznes';

  @override
  String get schedulingDate => 'Sana';

  @override
  String get schedulingReason => 'Sabab';

  @override
  String get schedulingReasonHint => 'Ixtiyoriy, masalan Bayram kuni';

  @override
  String get schedulingAddBlockedSubmit => 'Qo‘shish';

  @override
  String get schedulingDeleteBlockedTitle => 'Band vaqt o‘chirilsinmi?';

  @override
  String get schedulingDeleteBlockedConfirm =>
      'Bu vaqt yana band qilish uchun ochiq bo‘ladi.';

  @override
  String get staffFormDaysOffLabel => 'Dam olish kunlari';

  @override
  String get staffFormDaysOffHint => 'Bu xodim ishlamaydigan aniq sanalar.';

  @override
  String get staffFormAddDayOff => 'Dam olish kuni qo‘shish';
}
