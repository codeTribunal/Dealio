// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Russian (`ru`).
class AppLocalizationsRu extends AppLocalizations {
  AppLocalizationsRu([String locale = 'ru']) : super(locale);

  @override
  String emptySearchTitle(String query) {
    return 'Нет результатов по запросу «$query»';
  }

  @override
  String get emptyClearSearch => 'Очистить поиск';

  @override
  String get emptyClearFilter => 'Сбросить фильтр';

  @override
  String get apptEmptyMessage =>
      'Здесь появляются записи из бота и добавленные вручную.';

  @override
  String get projectsEmptyMessage =>
      'Отслеживайте проекты клиентов, этапы и счета здесь.';

  @override
  String get projectsEmptyCta => 'Создайте первый проект';

  @override
  String get projectsFilterEmpty => 'Нет проектов по этому фильтру';

  @override
  String get servicesEmptyTitle => 'Пока нет услуг';

  @override
  String get servicesEmptyMessage =>
      'Опишите услуги, которые клиенты смогут забронировать через бота.';

  @override
  String get servicesEmptyCta => 'Добавить услугу';

  @override
  String get staffEmptyTitle => 'Пока нет сотрудников';

  @override
  String get staffEmptyMessage =>
      'Добавьте сотрудников, чтобы назначать их на записи.';

  @override
  String get staffEmptyCta => 'Добавить сотрудника';

  @override
  String get catalogEmptyMessage =>
      'Создайте каталог, чтобы клиенты могли заказывать через бота.';

  @override
  String get catalogEmptyCta => 'Добавить товар';

  @override
  String get ordersEmptyMessage =>
      'Заказы, оформленные через бота, появляются здесь.';

  @override
  String get appTitle => 'Dealio';

  @override
  String get buttonSave => 'Сохранить';

  @override
  String get buttonSaveChanges => 'Сохранить изменения';

  @override
  String get buttonCancel => 'Отмена';

  @override
  String get buttonDelete => 'Удалить';

  @override
  String get buttonEdit => 'Редактировать';

  @override
  String get buttonAdd => 'Добавить';

  @override
  String get buttonCreate => 'Создать';

  @override
  String get buttonConfirm => 'Подтвердить';

  @override
  String get buttonContinue => 'Продолжить';

  @override
  String get buttonBack => 'Назад';

  @override
  String get buttonRetry => 'Повторить';

  @override
  String get buttonClose => 'Закрыть';

  @override
  String get buttonDone => 'Готово';

  @override
  String get buttonNext => 'Далее';

  @override
  String get buttonShare => 'Поделиться';

  @override
  String get buttonCopy => 'Копировать';

  @override
  String get commonSearch => 'Поиск';

  @override
  String get commonLoading => 'Загрузка';

  @override
  String get commonToday => 'Сегодня';

  @override
  String get commonYesterday => 'Вчера';

  @override
  String get commonActive => 'Активный';

  @override
  String get commonPaused => 'Приостановлен';

  @override
  String get commonOptional => 'необязательно';

  @override
  String get commonOptionalLabel => 'Необязательно';

  @override
  String get commonRequired => 'Обязательно';

  @override
  String get commonYes => 'Да';

  @override
  String get commonNo => 'Нет';

  @override
  String get commonAll => 'Все';

  @override
  String get commonNone => 'Нет';

  @override
  String get errorGeneric => 'Что-то пошло не так';

  @override
  String get errorLoadFailed => 'Не удалось загрузить';

  @override
  String errorWithMessage(String message) {
    return 'Ошибка: $message';
  }

  @override
  String get navHome => 'Главная';

  @override
  String get navCustomers => 'Клиенты';

  @override
  String get navOrders => 'Заказы';

  @override
  String get navCatalog => 'Каталог';

  @override
  String get navAppointments => 'Записи';

  @override
  String get navServices => 'Услуги';

  @override
  String get navStaff => 'Сотрудники';

  @override
  String get navProjects => 'Проекты';

  @override
  String get navAnalytics => 'Аналитика';

  @override
  String get navSettings => 'Настройки';

  @override
  String get profileTitle => 'Профиль';

  @override
  String get profilePhoneLabel => 'Телефон';

  @override
  String get profilePlanLabel => 'Тариф';

  @override
  String get profileBusinessSettings => 'Настройки бизнеса';

  @override
  String get navMessages => 'Сообщения';

  @override
  String get orderStatusNew => 'Новый';

  @override
  String get orderStatusPreparing => 'Готовится';

  @override
  String get orderStatusReady => 'Готов';

  @override
  String get orderStatusDelivered => 'Доставлен';

  @override
  String get orderStatusCancelled => 'Отменён';

  @override
  String get paymentStatusPending => 'Ожидает';

  @override
  String get paymentStatusPaymentReceived => 'Оплата получена';

  @override
  String get paymentStatusConfirmed => 'Подтверждён';

  @override
  String get appointmentStatusRequested => 'Запрошена';

  @override
  String get appointmentStatusConfirmed => 'Подтверждена';

  @override
  String get appointmentStatusCompleted => 'Завершена';

  @override
  String get appointmentStatusCancelled => 'Отменена';

  @override
  String get appointmentStatusNoShow => 'Не пришёл';

  @override
  String get projectStatusProposalSent => 'Предложение отправлено';

  @override
  String get projectStatusInProgress => 'В процессе';

  @override
  String get projectStatusReview => 'На проверке';

  @override
  String get projectStatusCompleted => 'Завершён';

  @override
  String get projectStatusCancelled => 'Отменён';

  @override
  String get milestoneStatusPending => 'Ожидает';

  @override
  String get milestoneStatusSubmittedForReview => 'Отправлено на проверку';

  @override
  String get milestoneStatusApproved => 'Одобрено';

  @override
  String get milestoneStatusPaymentReceived => 'Оплата получена';

  @override
  String get invoiceStatusUnpaid => 'Не оплачен';

  @override
  String get invoiceStatusPaid => 'Оплачен';

  @override
  String get deliveryMethodPickup => 'Самовывоз';

  @override
  String get deliveryMethodDelivery => 'Доставка';

  @override
  String get loginWelcomeTitle => 'Добро пожаловать';

  @override
  String get loginWelcomeSubtitle => 'Войдите, чтобы управлять своим бизнесом';

  @override
  String get loginPhoneLabel => 'Номер телефона';

  @override
  String get loginPhoneHint => '90 123 45 67';

  @override
  String get loginContinueButton => 'Продолжить';

  @override
  String get loginOtpHint => 'На ваш номер будет отправлен 4-значный код';

  @override
  String get loginErrorInvalidPhone => 'Введите корректный номер телефона';

  @override
  String get otpTitle => 'Введите код';

  @override
  String otpSubtitle(String phone) {
    return 'Мы отправили код на номер $phone';
  }

  @override
  String get otpCodeLabel => 'Код подтверждения';

  @override
  String get otpVerifyButton => 'Подтвердить';

  @override
  String get otpResendButton => 'Отправить код повторно';

  @override
  String get otpCodeResent => 'Код отправлен повторно';

  @override
  String get otpDevHint => 'В режиме разработки используйте 1234';

  @override
  String get otpErrorInvalid => 'Неверный код, попробуйте снова';

  @override
  String get consentGeneral =>
      'Я ознакомился с Политикой конфиденциальности и соглашаюсь на обработку моих персональных данных в соответствии с Законом Республики Узбекистан «О персональных данных».';

  @override
  String get consentGeneralLink => 'Политикой конфиденциальности';

  @override
  String get consentCrossBorder =>
      'Я соглашаюсь на хранение и передачу моих персональных данных на серверах, расположенных за пределами Узбекистана (Railway, Cloudflare).';

  @override
  String get arrivalTitle => 'Добро пожаловать в вашу CRM';

  @override
  String get arrivalSubtitle => 'Управляйте бизнесом — всё в одном месте.';

  @override
  String get arrivalLogIn => 'Войти';

  @override
  String get arrivalSignUp => 'Регистрация';

  @override
  String get loginReturningTitle => 'С возвращением';

  @override
  String get loginPhoneSubtitle =>
      'Введите номер телефона — мы отправим код в ваш Telegram.';

  @override
  String get loginSendCodeButton => 'Отправить код';

  @override
  String get loginCodeSentNotice =>
      'Если аккаунт существует, мы отправили 6-значный код в ваш Telegram. Код приходит от нашего бота входа. Если он не пришёл, откройте этого бота, нажмите Start и запросите код снова.';

  @override
  String get loginTooManyAttempts =>
      'Слишком много попыток. Попробуйте через несколько минут.';

  @override
  String get loginSendFailed => 'Не удалось отправить код. Проверьте номер.';

  @override
  String get loginChangeNumber => 'Изменить номер';

  @override
  String get onboardingVerifyHeader => 'Подтверждение через Telegram';

  @override
  String get onboardingVerifyTitle => 'Последний шаг для защиты аккаунта';

  @override
  String get onboardingVerifyStep1 =>
      'Нажмите «Подключить Telegram», чтобы открыть бота';

  @override
  String get onboardingVerifyStep2 => 'Нажмите «Поделиться номером» в чате';

  @override
  String get onboardingVerifyStep3 =>
      'Введите 6-значный код, который пришлёт бот';

  @override
  String get onboardingConnectTelegram => 'Подключить Telegram';

  @override
  String get onboardingConnectPreparing => 'Подготовка…';

  @override
  String get onboardingGetNewLink => 'Получить новую ссылку';

  @override
  String get onboardingCodeLabel => '6-значный код';

  @override
  String get onboardingVerifyLaunch => 'Подтвердить и запустить';

  @override
  String get onboardingVerifyingLabel => 'Проверка…';

  @override
  String get onboardingLinkExpiredError =>
      'Срок действия ссылки истёк. Нажмите «Подключить Telegram», чтобы получить новую.';

  @override
  String get onboardingInvalidCodeError =>
      'Неверный или просроченный код. Проверьте и попробуйте снова.';

  @override
  String get onboardingEnrollStartError =>
      'Не удалось начать подтверждение через Telegram. Попробуйте снова.';

  @override
  String get onboardingBusinessStepTitle => 'Расскажите о своём бизнесе';

  @override
  String get onboardingBusinessNameLabel => 'Название бизнеса';

  @override
  String get onboardingBusinessNameHint => 'например, Laylo Cakes';

  @override
  String get onboardingModeTitle => 'Чем занимается ваш бизнес?';

  @override
  String get onboardingModeProducts => 'Продажа товаров';

  @override
  String get onboardingModeProductsDesc =>
      'Торты, одежда, изделия ручной работы';

  @override
  String get onboardingModeServices => 'Оказание услуг';

  @override
  String get onboardingModeServicesDesc => 'Салон, репетиторство, записи';

  @override
  String get onboardingModeFreelance => 'Фриланс-проекты';

  @override
  String get onboardingModeFreelanceDesc => 'Дизайн, видео, разработка';

  @override
  String get onboardingBotStepTitle => 'Подключите свой Telegram-бот';

  @override
  String get onboardingBotTokenLabel => 'Токен бота';

  @override
  String get onboardingBotTokenHint => 'Вставьте токен от BotFather';

  @override
  String get onboardingPaymentStepTitle => 'Как клиенты будут платить?';

  @override
  String get onboardingReviewStepTitle => 'Проверка';

  @override
  String get onboardingDoneTitle => 'Всё готово!';

  @override
  String get onboardingDoneSubtitle => 'Ваш бизнес готов принимать заказы';

  @override
  String get onboardingDoneShareHint =>
      'Ваш CRM готов. Поделитесь ссылкой на бот с клиентами.';

  @override
  String get onboardingFinishButton => 'Перейти к панели управления';

  @override
  String get onboardingSetupTitle => 'Настройте свой бизнес';

  @override
  String get onboardingBusinessType => 'Тип бизнеса';

  @override
  String get onboardingLanguageLabel => 'Язык';

  @override
  String get onboardingModeProductsTitle => 'Продажа товаров';

  @override
  String get onboardingModeProductsSubtitle => 'Продажа через Telegram-бот';

  @override
  String get onboardingModeServicesTitle => 'Записи';

  @override
  String get onboardingModeServicesSubtitle =>
      'Для салонов, барберов, врачей, репетиторов';

  @override
  String get onboardingModeFreelanceTitle => 'Проекты';

  @override
  String get onboardingModeFreelanceSubtitle =>
      'Для фрилансеров, дизайнеров, блогеров';

  @override
  String get onboardingModeFreelanceShort => 'Фриланс';

  @override
  String get onboardingBotHeader => 'Telegram-бот';

  @override
  String get onboardingBotCreateTitle => 'Создайте свой Telegram-бот';

  @override
  String get onboardingBotCreateSubtitle =>
      'Ваши клиенты будут пользоваться этим ботом';

  @override
  String get onboardingBotStep1 => 'Откройте Telegram и найдите @BotFather';

  @override
  String get onboardingBotStep2 => 'Отправьте сообщение: /newbot';

  @override
  String get onboardingBotStep3 =>
      'Выберите имя для бота (например, Zulfiya Cakes)';

  @override
  String get onboardingBotStep4 =>
      'Выберите имя пользователя, оканчивающееся на _bot (например, zulfiya_cakes_bot)';

  @override
  String get onboardingBotStep5 => 'Скопируйте токен, который выдаст BotFather';

  @override
  String get onboardingBotPasteToken => 'Вставьте токен бота';

  @override
  String get onboardingVerifyToken => 'Проверить токен';

  @override
  String onboardingBotReady(String username) {
    return '@$username готов!';
  }

  @override
  String get onboardingPaymentHeader => 'Способ оплаты';

  @override
  String get onboardingPaymentSubtitle =>
      'Это можно изменить позже в Настройках';

  @override
  String onboardingCardNumberLabel(String optional) {
    return 'Номер карты ($optional)';
  }

  @override
  String get onboardingSkipForNow => 'Пропустить пока';

  @override
  String get onboardingAlmostDone => 'Почти готово!';

  @override
  String get onboardingSummaryType => 'Тип';

  @override
  String get onboardingSummaryBot => 'Бот';

  @override
  String get onboardingSummaryPayment => 'Оплата';

  @override
  String get onboardingNotSet => 'Не указано';

  @override
  String get onboardingLaunchCrm => 'Запустить CRM';

  @override
  String get settingsTitle => 'Настройки';

  @override
  String get settingsBusinessProfile => 'ПРОФИЛЬ БИЗНЕСА';

  @override
  String get settingsEditProfileTooltip => 'Редактировать профиль';

  @override
  String settingsDescriptionLabel(String optional) {
    return 'Описание ($optional)';
  }

  @override
  String get settingsAddressLabel => 'Адрес';

  @override
  String get settingsAddressHelper =>
      'Адрес, куда приходят клиенты (самовывоз или место встречи)';

  @override
  String get settingsEmailLabel => 'Email';

  @override
  String get settingsEmailInvalid => 'Введите корректный адрес эл. почты';

  @override
  String get emailPromptHeading => 'Получайте еженедельные отчёты на почту';

  @override
  String get emailPromptSubtext => 'Сводки по бизнесу и обновления продукта';

  @override
  String get emailPromptConsent =>
      'Присылайте мне еженедельные отчёты и обновления продукта';

  @override
  String get emailPromptSkip => 'Пропустить';

  @override
  String get emailPromptError => 'Что-то пошло не так. Попробуйте ещё раз.';

  @override
  String get settingsBusinessMode => 'ТИП БИЗНЕСА';

  @override
  String get settingsModeProductsLabel => 'Продажа товаров';

  @override
  String get settingsModeProductsDesc =>
      'Продавайте физические или цифровые товары через бот';

  @override
  String get settingsModeServicesLabel => 'Услуги / записи';

  @override
  String get settingsModeServicesDesc =>
      'Принимайте бронирования и управляйте записями';

  @override
  String get settingsModeFreelanceLabel => 'Фриланс / проекты';

  @override
  String get settingsModeFreelanceDesc => 'Отслеживайте этапы проектов и счета';

  @override
  String get settingsModeAtLeastOne => 'Должен быть активен хотя бы один тип.';

  @override
  String get settingsPaymentMethod => 'СПОСОБ ОПЛАТЫ';

  @override
  String get settingsEditPaymentTooltip => 'Редактировать оплату';

  @override
  String get settingsCardNumberLabel => 'Номер карты';

  @override
  String get settingsNoCardWarning =>
      'Карта для оплаты не указана. Клиенты не смогут оплатить.';

  @override
  String get settingsCalendarSync => 'СИНХРОНИЗАЦИЯ КАЛЕНДАРЯ';

  @override
  String get settingsCalendarSyncTitle => 'Синхронизировать с моим календарём';

  @override
  String get settingsCalendarSyncSubtitle =>
      'Добавляйте записи, доставки и сроки в свой календарь';

  @override
  String get settingsCalendarLinkLabel => 'Ссылка на ваш календарь';

  @override
  String get settingsCalendarLinkCopied => 'Ссылка на календарь скопирована';

  @override
  String get settingsCalendarSyncFailed =>
      'Не удалось обновить синхронизацию календаря';

  @override
  String get settingsAddToGoogleCalendar => 'Добавить в Google Calendar';

  @override
  String get settingsAddToAppleCalendar => 'Добавить в Apple Calendar';

  @override
  String get settingsCalendarSamsungNote =>
      'Пользователям Samsung: добавьте в Google Calendar — он автоматически синхронизируется с Samsung Calendar.';

  @override
  String get settingsReminders => 'НАПОМИНАНИЯ';

  @override
  String get settingsRemindersSubtitle =>
      'Получайте уведомления перед записями, доставками и сроками';

  @override
  String get settingsReminderSaveFailed =>
      'Не удалось сохранить настройку напоминания';

  @override
  String get settingsRemindersLoadFailed =>
      'Не удалось загрузить настройки напоминаний';

  @override
  String get settingsReminderAppointmentTitle => 'Напоминания о записях';

  @override
  String get settingsReminderAppointmentSubtitle => 'Перед каждой записью';

  @override
  String get settingsReminderSecondTitle => 'Второе напоминание';

  @override
  String get settingsReminderSecondSubtitle =>
      'Финальное напоминание ближе к времени';

  @override
  String get settingsReminderDeliveryTitle => 'Напоминания о доставке';

  @override
  String get settingsReminderDeliverySubtitle => 'Перед доставкой заказа';

  @override
  String get settingsReminderDeadlineTitle => 'Напоминания о сроках';

  @override
  String get settingsReminderDeadlineSubtitle =>
      'Перед этапами и сроками проектов';

  @override
  String settingsReminderHoursBefore(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'за $count часов',
      one: 'за 1 час',
    );
    return '$_temp0';
  }

  @override
  String settingsReminderDaysBefore(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'за $count дней',
      one: 'за 1 день',
    );
    return '$_temp0';
  }

  @override
  String get settingsRemindersFootnote =>
      'Напоминания отправляются в это приложение и в ваш Telegram.';

  @override
  String get settingsTelegramBot => 'TELEGRAM-БОТ';

  @override
  String get settingsChangeBot => 'Сменить бота';

  @override
  String get settingsBotTokenHint =>
      'Вставьте новый токен от @BotFather, если вы отозвали или заменили бота.';

  @override
  String get settingsBotTokenUpdated => 'Бот обновлён';

  @override
  String get settingsNoBotConfigured =>
      'Бот не настроен. Обратитесь в поддержку, чтобы настроить бот.';

  @override
  String get settingsCopyLinkTooltip => 'Копировать ссылку';

  @override
  String get settingsBotLinkCopied => 'Ссылка на бот скопирована';

  @override
  String get settingsLanguage => 'ЯЗЫК';

  @override
  String get settingsLanguageFootnote =>
      'Это меняет язык приложения и язык, который ваш Telegram-бот использует с клиентами.';

  @override
  String get settingsAccount => 'АККАУНТ';

  @override
  String get settingsLogOut => 'Выйти';

  @override
  String get settingsCustomerFields => 'ПОЛЯ КЛИЕНТА';

  @override
  String get settingsAddFieldTooltip => 'Добавить поле';

  @override
  String get settingsNoCustomFields =>
      'Нет дополнительных полей. Добавьте поля, чтобы собирать дополнительную информацию о клиентах.';

  @override
  String get settingsAddCustomerField => 'Добавить поле клиента';

  @override
  String get settingsFieldNameLabel => 'Название поля';

  @override
  String get settingsFieldNameHint => 'например, Компания, Instagram';

  @override
  String get settingsFieldTypeLabel => 'Тип поля';

  @override
  String get settingsFieldTypeText => 'Текст';

  @override
  String get settingsFieldTypeNumber => 'Число';

  @override
  String get settingsFieldTypeDate => 'Дата';

  @override
  String get settingsFieldTypeYesNo => 'Да / Нет';

  @override
  String get settingsPipelineStages => 'ЭТАПЫ ВОРОНКИ';

  @override
  String get settingsAddStageTooltip => 'Добавить этап';

  @override
  String get settingsNoStages =>
      'Нет этапов воронки. Добавьте этапы, чтобы отслеживать, на каком этапе продаж находятся клиенты.';

  @override
  String get settingsAddStage => 'Добавить этап воронки';

  @override
  String get settingsStageNameLabel => 'Название этапа';

  @override
  String get settingsStageNameHint => 'например, Лид, Переговоры, Сделка';

  @override
  String get settingsColorLabel => 'Цвет';

  @override
  String get settingsCheckoutQuestions => 'ВОПРОСЫ ПРИ ЗАКАЗЕ';

  @override
  String get settingsAddQuestionTooltip => 'Добавить вопрос';

  @override
  String get settingsNoCheckoutQuestions =>
      'Нет вопросов при заказе. Вопросы задаются в Telegram-боте при оформлении заказа.';

  @override
  String get settingsAddCheckoutQuestion => 'Добавить вопрос при заказе';

  @override
  String get settingsQuestionLabel => 'Вопрос';

  @override
  String get settingsQuestionHint =>
      'например, Есть ли аллергия или особые пожелания?';

  @override
  String get settingsServices => 'УСЛУГИ';

  @override
  String get settingsManageServices => 'Управление услугами';

  @override
  String get settingsStaff => 'СОТРУДНИКИ';

  @override
  String get settingsManageStaff => 'Управление сотрудниками';

  @override
  String get homeSearchHint => 'Поиск клиентов...';

  @override
  String get homeNoCustomersFound => 'Клиенты не найдены';

  @override
  String get homeNoContactInfo => 'Нет контактных данных';

  @override
  String homeOrdersCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count заказов',
      few: '$count заказа',
      one: '1 заказ',
    );
    return '$_temp0';
  }

  @override
  String get homeNeedsAttention => 'Требует внимания';

  @override
  String get homeTodaysActivity => 'Сегодняшняя активность';

  @override
  String get homeOverdue => 'Просрочено';

  @override
  String homeDaysSilent(int days) {
    return '$days дн. без активности';
  }

  @override
  String get homeBadgeAppointment => 'Запись';

  @override
  String get homeBadgeProject => 'Проект';

  @override
  String get homeBadgeMilestone => 'Этап';

  @override
  String homeActivityCancelled(String service) {
    return '$service — отменена';
  }

  @override
  String homeActivityNewProject(String customer) {
    return 'Новый проект • $customer';
  }

  @override
  String homeActivityMilestoneApproved(String project) {
    return 'Одобрено • $project';
  }

  @override
  String get homeNoActivity => 'Сегодня активности нет';

  @override
  String get homeWelcome => 'Здравствуйте';

  @override
  String get homeHeroTodayOrders => 'Заказы сегодня';

  @override
  String get homeHeroTodayAppointments => 'Записи сегодня';

  @override
  String get homeHeroTodayProjects => 'Новые проекты сегодня';

  @override
  String get homeStatPending => 'Ожидают оплаты';

  @override
  String get homeStatNewCustomers => 'Новые клиенты';

  @override
  String homePendingPaymentsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count ожидают оплаты',
      one: '1 ожидает оплаты',
      zero: 'Нет ожидающих оплат',
    );
    return '$_temp0';
  }

  @override
  String get ordersTitle => 'Заказы';

  @override
  String get ordersSearchHint => 'Поиск по имени или № заказа';

  @override
  String orderNumberLabel(int number) {
    return 'Заказ №$number';
  }

  @override
  String get orderPaidBadge => '💰 Оплачено';

  @override
  String get ordersEmpty => 'Заказов пока нет';

  @override
  String get ordersEmptyFiltered => 'Нет заказов по вашему фильтру';

  @override
  String get commonTotal => 'Итого';

  @override
  String get orderDetailTitle => 'Заказ';

  @override
  String get orderPaymentPaid => 'Оплачено';

  @override
  String get orderPaymentPending => 'Ожидает оплаты';

  @override
  String get orderSectionCustomer => 'Клиент';

  @override
  String get orderSectionItems => 'Товары';

  @override
  String get orderSectionDelivery => 'Доставка';

  @override
  String get orderSectionPaymentProof => 'Чек оплаты';

  @override
  String get orderProofUnavailable => 'Чек недоступен';

  @override
  String get orderSectionNotes => 'Заметки';

  @override
  String get orderSectionResponses => 'Ответы клиента';

  @override
  String get orderSectionTimeline => 'Хронология';

  @override
  String get orderTimelinePlaced => 'Заказ оформлен';

  @override
  String get orderTimelineReady => 'Готов к выдаче / доставке';

  @override
  String get orderTimelinePaymentConfirmed => 'Оплата подтверждена';

  @override
  String get orderConfirmPayment => 'Подтвердить оплату';

  @override
  String get orderStartPreparing => 'Начать готовить';

  @override
  String get orderMarkReady => 'Отметить как готовый';

  @override
  String get orderMarkDelivered => 'Отметить как доставленный';

  @override
  String get orderCancel => 'Отменить заказ';

  @override
  String get orderPaymentAlreadyConfirmed => 'Оплата уже подтверждена';

  @override
  String get orderCancelTitle => 'Отменить заказ?';

  @override
  String get orderCancelConfirm => 'Это действие нельзя отменить.';

  @override
  String get orderKeep => 'Оставить';

  @override
  String get customersTitle => 'Клиенты';

  @override
  String get customersSearchHint => 'Поиск по имени, @handle или телефону';

  @override
  String get customersEmpty => 'Клиентов пока нет';

  @override
  String get customersEmptyFiltered => 'Нет клиентов по вашему запросу';

  @override
  String get customersEmptyHint =>
      'Клиенты добавляются, когда оформляют заказ через бот';

  @override
  String get customerDetailTitle => 'Клиент';

  @override
  String get customerNewTitle => 'Новый клиент';

  @override
  String get customerFormName => 'Имя';

  @override
  String get customerFormNameHint => 'Имя клиента';

  @override
  String get customerFormNameRequired => 'Введите имя';

  @override
  String get customerFormPhone => 'Телефон';

  @override
  String get customerFormPhoneHint => 'Номер телефона (необязательно)';

  @override
  String get customerFormTelegram => 'Telegram';

  @override
  String get customerFormTelegramHint => 'имя пользователя';

  @override
  String get customerFormNotes => 'Заметки';

  @override
  String get customerFormNotesHint => 'Заметки (необязательно)';

  @override
  String get customerCreate => 'Добавить клиента';

  @override
  String get customerAddTag => 'Добавить тег';

  @override
  String get customerTagHint =>
      'Название тега (например, VIP, Любитель тортов)';

  @override
  String get customerSetStage => 'Выбрать этап воронки';

  @override
  String get customerNoStage => 'Без этапа';

  @override
  String get customerSetStageShort => 'Выбрать этап';

  @override
  String customerSince(String date) {
    return 'С $date';
  }

  @override
  String get customerStatOrders => 'Заказы';

  @override
  String get customerStatTotalSpent => 'Всего потрачено';

  @override
  String get customerStatLastOrder => 'Последний заказ';

  @override
  String customerDaysAgo(int days) {
    return '$days дн. назад';
  }

  @override
  String get customerAddReminder => 'Добавить напоминание';

  @override
  String get customerReminderHint =>
      'Заметка (например, связаться по заказу №12)';

  @override
  String get customerSaveReminder => 'Сохранить напоминание';

  @override
  String get customerNoReminders =>
      'Нет напоминаний. Нажмите +, чтобы добавить.';

  @override
  String get customerNotesLabel => 'ЗАМЕТКИ';

  @override
  String get customerNotesHint => 'Добавьте заметки об этом клиенте…';

  @override
  String get customerNoNotes =>
      'Заметок пока нет. Нажмите «Редактировать», чтобы добавить.';

  @override
  String get customerCustomFields => 'ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ';

  @override
  String get customerNoCustomFields =>
      'Дополнительные поля не заданы. Добавьте поля в Настройках.';

  @override
  String get customerTapToSet => 'Нажмите, чтобы указать';

  @override
  String get customerOrderHistory => 'ИСТОРИЯ ЗАКАЗОВ';

  @override
  String get customerLoadError => 'Не удалось загрузить клиента';

  @override
  String get customerLoadErrorHint =>
      'Проверьте подключение и попробуйте снова';

  @override
  String get catalogTitle => 'Каталог';

  @override
  String catalogPrepTime(String time) {
    return 'Подготовка: $time';
  }

  @override
  String get catalogEmpty => 'Товаров пока нет';

  @override
  String get catalogEmptyHint => 'Нажмите +, чтобы добавить первый товар';

  @override
  String get stockUnlimited => 'Неограниченно';

  @override
  String get stockNoInfo => 'Нет данных об остатке';

  @override
  String get stockOut => 'Нет в наличии';

  @override
  String stockIn(int count) {
    return 'В наличии: $count';
  }

  @override
  String get productFormNewTitle => 'Новый товар';

  @override
  String get productFormEditTitle => 'Редактировать товар';

  @override
  String get productFormNameLabel => 'Название товара *';

  @override
  String get productFormNameHint => 'например, Шоколадный торт';

  @override
  String get productFormNameRequired => 'Название обязательно';

  @override
  String get productFormPriceLabel => 'Цена *';

  @override
  String get productFormPriceRequired => 'Цена обязательна';

  @override
  String get productFormPriceInvalid => 'Введите корректную цену';

  @override
  String get productFormDescLabel => 'Описание';

  @override
  String get productFormDescHint => 'Необязательное описание товара';

  @override
  String get productFormStockLabel => 'Количество на складе';

  @override
  String get productFormStockHint => 'например, 10';

  @override
  String get productFormStockInvalid => 'Введите 0 или больше';

  @override
  String get productFormTimeLabel => 'Время';

  @override
  String get productFormUnitLabel => 'Единица';

  @override
  String get prepUnitMinutes => 'Минуты';

  @override
  String get prepUnitHours => 'Часы';

  @override
  String get prepUnitDays => 'Дни';

  @override
  String get prepUnitWeeks => 'Недели';

  @override
  String get productFormActiveOn => 'Товар виден в каталоге бота';

  @override
  String get productFormActiveOff => 'Товар скрыт от клиентов';

  @override
  String get productFormCreate => 'Создать товар';

  @override
  String get formRequired => 'Обязательно';

  @override
  String get formPositiveInteger => 'Введите положительное целое число';

  @override
  String durationMinutes(int min) {
    return '$min мин';
  }

  @override
  String get servicesTitle => 'Услуги';

  @override
  String get servicesEmpty => 'Услуг пока нет. Нажмите +, чтобы добавить.';

  @override
  String get serviceFormNewTitle => 'Новая услуга';

  @override
  String get serviceFormEditTitle => 'Редактировать услугу';

  @override
  String get serviceFormNameLabel => 'Название услуги';

  @override
  String get serviceFormDurationLabel => 'Длительность (минуты)';

  @override
  String get serviceFormPriceLabel => 'Цена (сум)';

  @override
  String get serviceFormActiveSubtitle => 'Видна клиентам в боте';

  @override
  String get serviceDeleteButton => 'Удалить услугу';

  @override
  String get serviceDeleteTitle => 'Удалить эту услугу?';

  @override
  String get serviceDeleteConfirm =>
      'Она будет скрыта из вашего бота и перемещена в удалённые. Вы сможете восстановить её позже.';

  @override
  String get productDeleteButton => 'Удалить товар';

  @override
  String get productDeleteTitle => 'Удалить этот товар?';

  @override
  String get productDeleteConfirm =>
      'Он будет скрыт из вашего бота и перемещён в удалённые. Вы сможете восстановить его позже.';

  @override
  String get staffTitle => 'Сотрудники';

  @override
  String get staffEmpty => 'Сотрудников пока нет. Нажмите +, чтобы добавить.';

  @override
  String get staffNoServices => 'Услуги не назначены';

  @override
  String get staffFormNewTitle => 'Новый сотрудник';

  @override
  String get staffFormEditTitle => 'Редактировать сотрудника';

  @override
  String staffDeleteTitle(String name) {
    return 'Удалить $name?';
  }

  @override
  String get staffThisMember => 'этого сотрудника';

  @override
  String get staffDeleteConfirm => 'Это нельзя отменить.';

  @override
  String get staffFormNameLabel => 'Полное имя';

  @override
  String get staffFormTelegramLabel => 'Telegram (необязательно)';

  @override
  String get staffFormServicesLabel => 'Выполняемые услуги';

  @override
  String get staffNoServicesAvailable =>
      'Нет доступных услуг. Сначала добавьте услуги.';

  @override
  String get staffSelectService => 'Выберите хотя бы одну услугу';

  @override
  String get appointmentsTitle => 'Записи';

  @override
  String get apptTomorrow => 'Завтра';

  @override
  String get apptEmpty => 'На этот день записей нет';

  @override
  String get apptEmptyHint => 'Нажмите +, чтобы добавить';

  @override
  String get apptDetailTitle => 'Запись';

  @override
  String get apptPayInAdvance => 'Оплата заранее';

  @override
  String get apptPayAtAppointment => 'Оплата на месте';

  @override
  String get apptNotesHint => 'Добавьте заметки…';

  @override
  String get apptNoNotes => 'Нет заметок';

  @override
  String get apptConfirmPayment => 'Подтвердить получение оплаты';

  @override
  String get apptConfirm => 'Подтвердить запись';

  @override
  String get apptMarkCompleted => 'Отметить как завершённую';

  @override
  String get apptMarkNoShow => 'Отметить как неявку';

  @override
  String get apptCancel => 'Отменить запись';

  @override
  String get apptFormTitle => 'Новая запись';

  @override
  String get apptFormCustomerLabel => 'Клиент *';

  @override
  String get apptFormSelectExisting => 'Выбрать существующего';

  @override
  String get apptFormEnterManually => 'Ввести вручную';

  @override
  String get apptFormSelectCustomer => 'Выберите клиента';

  @override
  String get apptFormCustomerNameLabel => 'Имя клиента';

  @override
  String get apptFormCustomerNameHint => 'Введите имя клиента';

  @override
  String get apptFormServiceLabel => 'Услуга *';

  @override
  String get apptFormFromServices => 'Из моих услуг';

  @override
  String get apptFormServiceField => 'Услуга';

  @override
  String get apptFormSelectService => 'Выберите услугу';

  @override
  String get apptFormServiceNameHint => 'например, Стрижка, Консультация, Урок';

  @override
  String get apptFormDurationLabel => 'Длительность (мин)';

  @override
  String get apptFormStaffLabel => 'Сотрудник';

  @override
  String get apptFormAnyStaff => 'Любой доступный';

  @override
  String get apptFormWhenLabel => 'Когда *';

  @override
  String get apptFormDateLabel => 'Дата';

  @override
  String get apptFormSelectDate => 'Выберите дату';

  @override
  String get apptFormSelectTime => 'Выберите время';

  @override
  String get apptFormPaymentLabel => 'Оплата';

  @override
  String get apptFormNotesHint => 'Любые заметки об этой записи...';

  @override
  String get apptFormCreate => 'Создать запись';

  @override
  String get apptEditTitle => 'Изменить запись';

  @override
  String get apptEdit => 'Изменить';

  @override
  String get apptStatusLabel => 'Статус';

  @override
  String get apptConflictTitle => 'Пересекается с существующей записью';

  @override
  String get apptConflictBody =>
      'Это время пересекается с другой записью. Всё равно добавить?';

  @override
  String get apptConflictConfirm => 'Всё равно добавить';

  @override
  String get apptErrSelectCustomer => 'Выберите клиента';

  @override
  String get apptErrEnterCustomer => 'Введите имя клиента';

  @override
  String get apptErrSelectService => 'Выберите услугу';

  @override
  String get apptErrEnterService => 'Введите название услуги';

  @override
  String get apptErrSelectDateTime => 'Выберите дату и время';

  @override
  String get projectsTitle => 'Проекты';

  @override
  String get projectsFilterProposal => 'Предложение';

  @override
  String get projectsFilterReview => 'Проверка';

  @override
  String get projectsEmpty => 'Проектов пока нет';

  @override
  String projectsMilestoneCount(int done, int total) {
    return '$done/$total этапов';
  }

  @override
  String get projectDetailTitle => 'Проект';

  @override
  String get projectMarkInProgress => 'Отметить как в процессе';

  @override
  String get projectSendForReview => 'Отправить на проверку';

  @override
  String get projectMarkCompleted => 'Отметить как завершённый';

  @override
  String get projectCancelProject => 'Отменить проект';

  @override
  String projectStatusUpdated(String status) {
    return 'Статус изменён на: $status';
  }

  @override
  String get projectClient => 'Клиент';

  @override
  String get projectPhone => 'Телефон';

  @override
  String get projectStart => 'Начало';

  @override
  String get projectDeadline => 'Срок';

  @override
  String get projectScope => 'Объём работ';

  @override
  String get projectPaymentTerms => 'Условия оплаты';

  @override
  String get projectProposalCopied => 'Ссылка на предложение скопирована';

  @override
  String get projectShareProposal => 'Поделиться ссылкой на предложение';

  @override
  String get projectMilestones => 'Этапы';

  @override
  String get projectNoMilestones => 'Этапов пока нет';

  @override
  String get milestoneAwaitingReview => 'Ожидает проверки клиентом';

  @override
  String get milestoneApprovedByClient => 'Одобрено клиентом';

  @override
  String projectDuePrefix(String date) {
    return 'Срок: $date';
  }

  @override
  String get projectResetMilestone => 'Сбросить этап';

  @override
  String projectResetMilestoneBody(String name) {
    return 'Вернуть этап «$name» в статус «Ожидает»?\n\nЭто для тестирования — клиент не будет уведомлён.';
  }

  @override
  String get projectResetToPending => 'Вернуть в ожидание';

  @override
  String get projectSubmitForReview => 'Отправить клиенту на проверку';

  @override
  String get projectWaitingApproval => 'Ожидание одобрения клиента';

  @override
  String get projectMarkPaymentReceived => 'Отметить оплату полученной';

  @override
  String get projectInvoices => 'Счета';

  @override
  String get projectGenerate => 'Создать';

  @override
  String get projectNoInvoices => 'Счетов пока нет';

  @override
  String get projectInvoiceCopied => 'Ссылка на счёт скопирована';

  @override
  String get projectMarkPaid => 'Отметить оплаченным';

  @override
  String get projectGenerateInvoice => 'Создать счёт';

  @override
  String get projectQty => 'Кол-во';

  @override
  String get projectUnitPrice => 'Цена за единицу (сум)';

  @override
  String get projectDueDateLabel => 'Срок (ГГГГ-ММ-ДД)';

  @override
  String get projectFormTitle => 'Новый проект';

  @override
  String get projectSelectClient => 'Выберите клиента';

  @override
  String get projectClientNameLabel => 'Имя клиента';

  @override
  String get projectClientNameHint => 'Введите имя клиента';

  @override
  String get projectNameLabel => 'Название проекта';

  @override
  String get projectNameHint => 'например, Редизайн фирменного стиля';

  @override
  String get projectScopeHint => 'Опишите результаты...';

  @override
  String get projectPriceLabel => 'Согласованная общая цена (сум)';

  @override
  String get projectTermsHint => 'например, 50% предоплата, 50% при сдаче';

  @override
  String get projectStartDate => 'Дата начала';

  @override
  String get projectFormCreate => 'Создать проект';

  @override
  String get projectErrSelectClient => 'Пожалуйста, выберите клиента';

  @override
  String get projectErrEnterClient => 'Введите имя клиента';

  @override
  String get projectErrNameRequired => 'Название проекта обязательно';

  @override
  String get milestoneFormTitle => 'Добавить этап';

  @override
  String get milestoneAdd => 'Добавить этап';

  @override
  String get milestoneNameLabel => 'Название этапа';

  @override
  String get milestoneNameHint => 'например, Первые макеты дизайна';

  @override
  String get milestoneAmountLabel => 'Сумма (сум)';

  @override
  String get milestoneDueDateLabel => 'Срок';

  @override
  String get milestoneAmountInvalid => 'Введите корректную сумму';

  @override
  String get analyticsTitle => 'Аналитика';

  @override
  String get analyticsNoDataLastMonth => 'Нет данных за прошлый месяц';

  @override
  String analyticsVsLastMonth(String change) {
    return '$change% к прошлому месяцу';
  }

  @override
  String get analyticsRevenueThisMonth => 'Выручка за этот месяц';

  @override
  String get analyticsThisMonthShort => 'Этот месяц';

  @override
  String get analyticsLastMonthShort => 'Прошлый месяц';

  @override
  String analyticsLastMonth(String amount) {
    return 'Прошлый месяц: $amount';
  }

  @override
  String get analyticsCompletedThisMonth => 'Завершено\nза месяц';

  @override
  String get analyticsAvgOrderValue => 'Средний\nзаказ';

  @override
  String get analyticsAppointmentsThisMonth => 'Записи\nза месяц';

  @override
  String analyticsApptCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count записей',
      few: '$count записи',
      one: '1 запись',
    );
    return '$_temp0';
  }

  @override
  String get analyticsPendingPayments => 'Ожидающие оплаты';

  @override
  String get analyticsAllReceived => 'Все платежи получены';

  @override
  String get analyticsTopCustomers => 'Лучшие клиенты — последние 90 дней';

  @override
  String get analyticsLast6Months => 'Последние 6 месяцев';

  @override
  String get analyticsNoConfirmedOrders =>
      'Нет подтверждённого дохода за последние 90 дней';

  @override
  String get analyticsBestSelling => 'Самый продаваемый товар';

  @override
  String analyticsUnitsSold(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'продано $count шт.',
      few: 'продано $count шт.',
      one: 'продана 1 шт.',
    );
    return '$_temp0';
  }

  @override
  String get schedulingWorkingHours => 'Часы работы';

  @override
  String get schedulingWorkingHoursHint =>
      'Когда клиенты могут записаться. Время по Ташкенту, 24-часовой формат.';

  @override
  String get schedulingOpen => 'Открыто';

  @override
  String get schedulingClosed => 'Закрыто';

  @override
  String get schedulingDayMon => 'Понедельник';

  @override
  String get schedulingDayTue => 'Вторник';

  @override
  String get schedulingDayWed => 'Среда';

  @override
  String get schedulingDayThu => 'Четверг';

  @override
  String get schedulingDayFri => 'Пятница';

  @override
  String get schedulingDaySat => 'Суббота';

  @override
  String get schedulingDaySun => 'Воскресенье';

  @override
  String get schedulingStart => 'Начало';

  @override
  String get schedulingEnd => 'Конец';

  @override
  String get schedulingTimeInvalid =>
      'Время начала должно быть раньше времени окончания.';

  @override
  String get schedulingBuffer => 'Перерыв между записями';

  @override
  String get schedulingBufferHint =>
      'Промежуток после каждой записи, например для уборки.';

  @override
  String get schedulingBufferUnit => 'минут';

  @override
  String get schedulingWorkingHoursSaved => 'Часы работы сохранены';

  @override
  String get schedulingCopyToWeekdays => 'Скопировать на будни';

  @override
  String get schedulingCopiedToWeekdays => 'Скопировано на Пн–Пт';

  @override
  String get schedulingUnavailable => 'Недоступно';

  @override
  String get schedulingAddHours => 'Добавить часы';

  @override
  String get schedulingRemoveSlot => 'Удалить';

  @override
  String get schedulingOverlap => 'Часы работы не должны пересекаться.';

  @override
  String get schedulingBlockedTime => 'Заблокированное время';

  @override
  String get schedulingBlockedTimeHint =>
      'Заблокируйте отпуска, перерывы или разовые закрытия, чтобы клиенты не могли записаться.';

  @override
  String get schedulingAddBlocked => 'Добавить блокировку';

  @override
  String get schedulingNoBlocked => 'Нет заблокированного времени';

  @override
  String get schedulingScope => 'Относится к';

  @override
  String get schedulingWholeBusiness => 'Весь бизнес';

  @override
  String get schedulingDate => 'Дата';

  @override
  String get schedulingReason => 'Причина';

  @override
  String get schedulingReasonHint => 'Необязательно, например Праздник';

  @override
  String get schedulingAddBlockedSubmit => 'Добавить';

  @override
  String get schedulingDeleteBlockedTitle => 'Удалить блокировку?';

  @override
  String get schedulingDeleteBlockedConfirm =>
      'Это время снова станет доступным для записи.';

  @override
  String get staffFormDaysOffLabel => 'Выходные';

  @override
  String get staffFormDaysOffHint =>
      'Конкретные даты, когда этот сотрудник недоступен.';

  @override
  String get staffFormAddDayOff => 'Добавить выходной';

  @override
  String get settingsModeSwitchTitle => 'Сменить тип бизнеса?';

  @override
  String settingsModeSwitchBody(String from, String to, String data) {
    return 'Переход с «$from» на «$to» изменит всё рабочее пространство. Ваши текущие $data больше не будут отображаться и управляться, но они не удаляются. Клиенты останутся. Это нельзя отменить частично — чтобы снова их увидеть, придётся вернуться обратно. Вы уверены?';
  }

  @override
  String settingsModeSwitchConfirm(String to) {
    return 'Перейти на «$to»';
  }

  @override
  String get settingsModeNameServices => 'Записи';

  @override
  String get settingsModeNameFreelance => 'Проекты';

  @override
  String get settingsModeDataServices => 'записи';

  @override
  String get settingsModeDataFreelance => 'проекты';

  @override
  String get settingsModeDataProducts => 'заказы';

  @override
  String get buttonRestore => 'Восстановить';

  @override
  String get buttonYesDelete => 'Да, удалить';

  @override
  String get commonShowDeleted => 'Показать удалённые';

  @override
  String get commonDeletedBadge => 'Удалён';

  @override
  String get deleteCustomerTitle => 'Удалить этого клиента?';

  @override
  String get deleteCustomerBody =>
      'Он будет скрыт из списков вместе с его заказами и записями. Позже можно восстановить.';

  @override
  String get deleteOrderTitle => 'Удалить этот заказ?';

  @override
  String get deleteOrderBody =>
      'Он будет скрыт из списка заказов. Позже можно восстановить.';

  @override
  String get deleteAppointmentTitle => 'Удалить эту запись?';

  @override
  String get deleteAppointmentBody =>
      'Она будет скрыта из списка записей. Позже можно восстановить.';

  @override
  String get notificationView => 'Открыть';

  @override
  String get notificationDismiss => 'Скрыть';

  @override
  String get modeNotAvailable => 'Недоступно в вашем режиме бизнеса.';

  @override
  String get navCalendar => 'Календарь';

  @override
  String get calendarProjectDeadline => 'Срок проекта';

  @override
  String get calendarEmptyOrdersTitle => 'Нет запланированных доставок';

  @override
  String get calendarEmptyOrdersMessage =>
      'Заказы с датой доставки появятся здесь.';

  @override
  String get calendarEmptyDeadlinesTitle => 'Нет сроков';

  @override
  String get calendarEmptyDeadlinesMessage =>
      'Сроки проектов и этапов появятся здесь.';

  @override
  String get orderNewTitle => 'Новый заказ';

  @override
  String get orderCreate => 'Создать заказ';

  @override
  String get orderCustomerExisting => 'Существующий';

  @override
  String get orderCustomerNew => 'Новый';

  @override
  String get orderSelectCustomer => 'Выберите клиента';

  @override
  String get orderNoProducts => 'В каталоге пока нет товаров.';

  @override
  String get orderDeliveryPickup => 'Самовывоз';

  @override
  String get orderDeliveryDelivery => 'Доставка';

  @override
  String get orderAddressLabel => 'Адрес доставки';

  @override
  String get orderDateLabel => 'Дата доставки';

  @override
  String get orderErrSelectCustomer => 'Выберите или введите клиента';

  @override
  String get orderErrItems => 'Добавьте хотя бы один товар';

  @override
  String get orderErrAddress => 'Укажите адрес доставки';

  @override
  String get orderLimitReached =>
      'Достигнут лимит клиентов. Перейдите на Pro, чтобы добавить больше.';

  @override
  String get orderCreateError => 'Не удалось создать заказ. Попробуйте снова.';

  @override
  String get settingsPaymentCard => 'ПЛАТЁЖНАЯ КАРТА';

  @override
  String get settingsPaymentHint =>
      'Клиенты переводят на эту карту при оплате. Показывается в вашем Telegram-боте.';

  @override
  String get settingsCardHolderLabel => 'Имя владельца карты';

  @override
  String get settingsCardNotSet => 'Платёжная карта ещё не добавлена.';
}
