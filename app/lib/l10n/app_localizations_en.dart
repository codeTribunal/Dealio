// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Uzbek CRM';

  @override
  String get buttonSave => 'Save';

  @override
  String get buttonSaveChanges => 'Save changes';

  @override
  String get buttonCancel => 'Cancel';

  @override
  String get buttonDelete => 'Delete';

  @override
  String get buttonEdit => 'Edit';

  @override
  String get buttonAdd => 'Add';

  @override
  String get buttonCreate => 'Create';

  @override
  String get buttonConfirm => 'Confirm';

  @override
  String get buttonContinue => 'Continue';

  @override
  String get buttonBack => 'Back';

  @override
  String get buttonRetry => 'Try again';

  @override
  String get buttonClose => 'Close';

  @override
  String get buttonDone => 'Done';

  @override
  String get buttonNext => 'Next';

  @override
  String get buttonShare => 'Share';

  @override
  String get buttonCopy => 'Copy';

  @override
  String get commonSearch => 'Search';

  @override
  String get commonLoading => 'Loading';

  @override
  String get commonToday => 'Today';

  @override
  String get commonYesterday => 'Yesterday';

  @override
  String get commonActive => 'Active';

  @override
  String get commonPaused => 'Paused';

  @override
  String get commonOptional => 'optional';

  @override
  String get commonOptionalLabel => 'Optional';

  @override
  String get commonRequired => 'Required';

  @override
  String get commonYes => 'Yes';

  @override
  String get commonNo => 'No';

  @override
  String get commonAll => 'All';

  @override
  String get commonNone => 'None';

  @override
  String get errorGeneric => 'Something went wrong';

  @override
  String get errorLoadFailed => 'Failed to load';

  @override
  String errorWithMessage(String message) {
    return 'Error: $message';
  }

  @override
  String get navHome => 'Home';

  @override
  String get navCustomers => 'Customers';

  @override
  String get navOrders => 'Orders';

  @override
  String get navCatalog => 'Catalog';

  @override
  String get navAppointments => 'Appointments';

  @override
  String get navServices => 'Services';

  @override
  String get navStaff => 'Staff';

  @override
  String get navProjects => 'Projects';

  @override
  String get navAnalytics => 'Analytics';

  @override
  String get navSettings => 'Settings';

  @override
  String get navMessages => 'Messages';

  @override
  String get orderStatusNew => 'New';

  @override
  String get orderStatusPreparing => 'Preparing';

  @override
  String get orderStatusReady => 'Ready';

  @override
  String get orderStatusDelivered => 'Delivered';

  @override
  String get orderStatusCancelled => 'Cancelled';

  @override
  String get paymentStatusPending => 'Pending';

  @override
  String get paymentStatusPaymentReceived => 'Payment received';

  @override
  String get paymentStatusConfirmed => 'Confirmed';

  @override
  String get appointmentStatusRequested => 'Requested';

  @override
  String get appointmentStatusConfirmed => 'Confirmed';

  @override
  String get appointmentStatusCompleted => 'Completed';

  @override
  String get appointmentStatusCancelled => 'Cancelled';

  @override
  String get appointmentStatusNoShow => 'No-show';

  @override
  String get projectStatusProposalSent => 'Proposal sent';

  @override
  String get projectStatusInProgress => 'In progress';

  @override
  String get projectStatusReview => 'In review';

  @override
  String get projectStatusCompleted => 'Completed';

  @override
  String get projectStatusCancelled => 'Cancelled';

  @override
  String get milestoneStatusPending => 'Pending';

  @override
  String get milestoneStatusSubmittedForReview => 'Submitted for review';

  @override
  String get milestoneStatusApproved => 'Approved';

  @override
  String get milestoneStatusPaymentReceived => 'Payment received';

  @override
  String get invoiceStatusUnpaid => 'Unpaid';

  @override
  String get invoiceStatusPaid => 'Paid';

  @override
  String get deliveryMethodPickup => 'Pickup';

  @override
  String get deliveryMethodDelivery => 'Delivery';

  @override
  String get loginWelcomeTitle => 'Welcome';

  @override
  String get loginWelcomeSubtitle => 'Sign in to manage your business';

  @override
  String get loginPhoneLabel => 'Phone number';

  @override
  String get loginPhoneHint => '90 123 45 67';

  @override
  String get loginContinueButton => 'Continue';

  @override
  String get loginOtpHint => 'A 4-digit code will be sent to your number';

  @override
  String get loginErrorInvalidPhone => 'Enter a valid phone number';

  @override
  String get otpTitle => 'Enter the code';

  @override
  String otpSubtitle(String phone) {
    return 'We sent a code to $phone';
  }

  @override
  String get otpCodeLabel => 'Verification code';

  @override
  String get otpVerifyButton => 'Verify';

  @override
  String get otpResendButton => 'Resend code';

  @override
  String get otpCodeResent => 'Code resent';

  @override
  String get otpDevHint => 'Use 1234 in development';

  @override
  String get otpErrorInvalid => 'Invalid code, try again';

  @override
  String get consentGeneral =>
      'I have read the Privacy Policy and consent to the processing of my personal data in accordance with the Law of the Republic of Uzbekistan \"On Personal Data\".';

  @override
  String get consentGeneralLink => 'Privacy Policy';

  @override
  String get consentCrossBorder =>
      'I consent to the storage and transfer of my personal data on servers located outside Uzbekistan (Railway, Cloudflare).';

  @override
  String get onboardingBusinessStepTitle => 'Tell us about your business';

  @override
  String get onboardingBusinessNameLabel => 'Business name';

  @override
  String get onboardingBusinessNameHint => 'e.g. Laylo Cakes';

  @override
  String get onboardingModeTitle => 'What does your business do?';

  @override
  String get onboardingModeProducts => 'Sell products';

  @override
  String get onboardingModeProductsDesc => 'Cakes, clothes, handmade goods';

  @override
  String get onboardingModeServices => 'Offer services';

  @override
  String get onboardingModeServicesDesc => 'Salon, tutoring, appointments';

  @override
  String get onboardingModeFreelance => 'Freelance projects';

  @override
  String get onboardingModeFreelanceDesc => 'Design, video, development';

  @override
  String get onboardingBotStepTitle => 'Connect your Telegram bot';

  @override
  String get onboardingBotTokenLabel => 'Bot token';

  @override
  String get onboardingBotTokenHint => 'Paste the token from BotFather';

  @override
  String get onboardingPaymentStepTitle => 'How will customers pay?';

  @override
  String get onboardingReviewStepTitle => 'Review';

  @override
  String get onboardingDoneTitle => 'You\'re all set!';

  @override
  String get onboardingDoneSubtitle =>
      'Your business is ready to receive orders';

  @override
  String get onboardingDoneShareHint =>
      'Your CRM is ready. Share your bot link with customers.';

  @override
  String get onboardingFinishButton => 'Go to dashboard';

  @override
  String get onboardingSetupTitle => 'Set up your business';

  @override
  String get onboardingBusinessType => 'Business type';

  @override
  String get onboardingLanguageLabel => 'Language';

  @override
  String get onboardingModeProductsTitle => 'Product selling';

  @override
  String get onboardingModeProductsSubtitle => 'Sell via Telegram bot';

  @override
  String get onboardingModeServicesTitle => 'Appointments';

  @override
  String get onboardingModeServicesSubtitle =>
      'For salons, barbers, doctors, tutors';

  @override
  String get onboardingModeFreelanceTitle => 'Projects';

  @override
  String get onboardingModeFreelanceSubtitle =>
      'For freelancers, designers, influencers';

  @override
  String get onboardingModeFreelanceShort => 'Freelance';

  @override
  String get onboardingBotHeader => 'Telegram Bot';

  @override
  String get onboardingBotCreateTitle => 'Create your Telegram bot';

  @override
  String get onboardingBotCreateSubtitle => 'Your customers will use this bot';

  @override
  String get onboardingBotStep1 => 'Open Telegram and search for @BotFather';

  @override
  String get onboardingBotStep2 => 'Send the message: /newbot';

  @override
  String get onboardingBotStep3 =>
      'Choose a name for your bot (e.g. Zulfiya Cakes)';

  @override
  String get onboardingBotStep4 =>
      'Choose a username ending in _bot (e.g. zulfiya_cakes_bot)';

  @override
  String get onboardingBotStep5 => 'Copy the token BotFather gives you';

  @override
  String get onboardingBotPasteToken => 'Paste your bot token';

  @override
  String get onboardingVerifyToken => 'Verify token';

  @override
  String onboardingBotReady(String username) {
    return '@$username is ready!';
  }

  @override
  String get onboardingPaymentHeader => 'Payment Method';

  @override
  String get onboardingPaymentSubtitle =>
      'You can change this later in Settings';

  @override
  String onboardingCardNumberLabel(String optional) {
    return 'Card number ($optional)';
  }

  @override
  String get onboardingSkipForNow => 'Skip for now';

  @override
  String get onboardingAlmostDone => 'Almost done!';

  @override
  String get onboardingSummaryType => 'Type';

  @override
  String get onboardingSummaryBot => 'Bot';

  @override
  String get onboardingSummaryPayment => 'Payment';

  @override
  String get onboardingNotSet => 'Not set';

  @override
  String get onboardingLaunchCrm => 'Launch my CRM';

  @override
  String get settingsTitle => 'Settings';

  @override
  String get settingsBusinessProfile => 'BUSINESS PROFILE';

  @override
  String get settingsEditProfileTooltip => 'Edit profile';

  @override
  String settingsDescriptionLabel(String optional) {
    return 'Description ($optional)';
  }

  @override
  String get settingsBusinessMode => 'BUSINESS MODE';

  @override
  String get settingsModeProductsLabel => 'Product selling';

  @override
  String get settingsModeProductsDesc =>
      'Sell physical or digital products via the bot';

  @override
  String get settingsModeServicesLabel => 'Service / appointments';

  @override
  String get settingsModeServicesDesc =>
      'Accept bookings and manage appointments';

  @override
  String get settingsModeFreelanceLabel => 'Freelance / projects';

  @override
  String get settingsModeFreelanceDesc =>
      'Track project milestones and invoices';

  @override
  String get settingsModeAtLeastOne =>
      'You must have at least one mode active.';

  @override
  String get settingsPaymentMethod => 'PAYMENT METHOD';

  @override
  String get settingsEditPaymentTooltip => 'Edit payment';

  @override
  String get settingsCardNumberLabel => 'Card number';

  @override
  String get settingsNoCardWarning =>
      'No payment card set. Customers will not be able to pay.';

  @override
  String get settingsCalendarSync => 'CALENDAR SYNC';

  @override
  String get settingsCalendarSyncTitle => 'Sync to my calendar';

  @override
  String get settingsCalendarSyncSubtitle =>
      'Add appointments, deliveries and deadlines to your calendar';

  @override
  String get settingsCalendarLinkLabel => 'Your calendar link';

  @override
  String get settingsCalendarLinkCopied => 'Calendar link copied';

  @override
  String get settingsCalendarSyncFailed => 'Failed to update calendar sync';

  @override
  String get settingsAddToGoogleCalendar => 'Add to Google Calendar';

  @override
  String get settingsAddToAppleCalendar => 'Add to Apple Calendar';

  @override
  String get settingsCalendarSamsungNote =>
      'Samsung users: add to Google Calendar — it will sync to Samsung Calendar automatically.';

  @override
  String get settingsReminders => 'REMINDERS';

  @override
  String get settingsRemindersSubtitle =>
      'Get notified before appointments, deliveries and deadlines';

  @override
  String get settingsReminderSaveFailed => 'Failed to save reminder setting';

  @override
  String get settingsRemindersLoadFailed => 'Could not load reminder settings';

  @override
  String get settingsReminderAppointmentTitle => 'Appointment reminders';

  @override
  String get settingsReminderAppointmentSubtitle => 'Before each appointment';

  @override
  String get settingsReminderSecondTitle => 'Second reminder';

  @override
  String get settingsReminderSecondSubtitle =>
      'A final reminder closer to the time';

  @override
  String get settingsReminderDeliveryTitle => 'Delivery reminders';

  @override
  String get settingsReminderDeliverySubtitle =>
      'Before an order is due for delivery';

  @override
  String get settingsReminderDeadlineTitle => 'Deadline reminders';

  @override
  String get settingsReminderDeadlineSubtitle =>
      'Before milestones and project deadlines';

  @override
  String settingsReminderHoursBefore(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count hours before',
      one: '1 hour before',
    );
    return '$_temp0';
  }

  @override
  String settingsReminderDaysBefore(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count days before',
      one: '1 day before',
    );
    return '$_temp0';
  }

  @override
  String get settingsRemindersFootnote =>
      'Reminders are sent to this app and your Telegram.';

  @override
  String get settingsTelegramBot => 'TELEGRAM BOT';

  @override
  String get settingsNoBotConfigured =>
      'No bot configured. Contact support to set up your bot.';

  @override
  String get settingsCopyLinkTooltip => 'Copy link';

  @override
  String get settingsBotLinkCopied => 'Bot link copied';

  @override
  String get settingsLanguage => 'LANGUAGE';

  @override
  String get settingsLanguageFootnote =>
      'This changes the app language and the language your Telegram bot uses with customers.';

  @override
  String get settingsAccount => 'ACCOUNT';

  @override
  String get settingsLogOut => 'Log out';

  @override
  String get settingsCustomerFields => 'CUSTOMER FIELDS';

  @override
  String get settingsAddFieldTooltip => 'Add field';

  @override
  String get settingsNoCustomFields =>
      'No custom fields. Add fields to collect extra info about customers.';

  @override
  String get settingsAddCustomerField => 'Add customer field';

  @override
  String get settingsFieldNameLabel => 'Field name';

  @override
  String get settingsFieldNameHint => 'e.g. Company, Instagram handle';

  @override
  String get settingsFieldTypeLabel => 'Field type';

  @override
  String get settingsFieldTypeText => 'Text';

  @override
  String get settingsFieldTypeNumber => 'Number';

  @override
  String get settingsFieldTypeDate => 'Date';

  @override
  String get settingsFieldTypeYesNo => 'Yes / No';

  @override
  String get settingsPipelineStages => 'PIPELINE STAGES';

  @override
  String get settingsAddStageTooltip => 'Add stage';

  @override
  String get settingsNoStages =>
      'No pipeline stages. Add stages to track where customers are in your sales process.';

  @override
  String get settingsAddStage => 'Add pipeline stage';

  @override
  String get settingsStageNameLabel => 'Stage name';

  @override
  String get settingsStageNameHint => 'e.g. Lead, Negotiating, Won';

  @override
  String get settingsColorLabel => 'Color';

  @override
  String get settingsCheckoutQuestions => 'CHECKOUT QUESTIONS';

  @override
  String get settingsAddQuestionTooltip => 'Add question';

  @override
  String get settingsNoCheckoutQuestions =>
      'No checkout questions. Questions are asked in the Telegram bot during checkout.';

  @override
  String get settingsAddCheckoutQuestion => 'Add checkout question';

  @override
  String get settingsQuestionLabel => 'Question';

  @override
  String get settingsQuestionHint => 'e.g. Any allergies or special requests?';

  @override
  String get settingsServices => 'SERVICES';

  @override
  String get settingsManageServices => 'Manage services';

  @override
  String get settingsStaff => 'STAFF';

  @override
  String get settingsManageStaff => 'Manage staff';

  @override
  String get homeSearchHint => 'Search customers...';

  @override
  String get homeNoCustomersFound => 'No customers found';

  @override
  String get homeNoContactInfo => 'No contact info';

  @override
  String homeOrdersCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count orders',
      one: '1 order',
    );
    return '$_temp0';
  }

  @override
  String get homeNeedsAttention => 'Needs attention';

  @override
  String get homeTodaysActivity => 'Today\'s activity';

  @override
  String get homeOverdue => 'Overdue';

  @override
  String homeDaysSilent(int days) {
    return '${days}d silent';
  }

  @override
  String get homeBadgeAppointment => 'Appointment';

  @override
  String get homeBadgeProject => 'Project';

  @override
  String get homeBadgeMilestone => 'Milestone';

  @override
  String homeActivityCancelled(String service) {
    return '$service — cancelled';
  }

  @override
  String homeActivityNewProject(String customer) {
    return 'New project • $customer';
  }

  @override
  String homeActivityMilestoneApproved(String project) {
    return 'Approved • $project';
  }

  @override
  String get homeNoActivity => 'No activity today';

  @override
  String get homeWelcome => 'Welcome';

  @override
  String get homeHeroTodayOrders => 'Today\'s orders';

  @override
  String get homeStatPending => 'Pending payments';

  @override
  String get homeStatNewCustomers => 'New customers';

  @override
  String homePendingPaymentsCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count pending payments',
      one: '1 pending payment',
      zero: 'No pending payments',
    );
    return '$_temp0';
  }

  @override
  String get ordersTitle => 'Orders';

  @override
  String get ordersSearchHint => 'Search by name or order #';

  @override
  String orderNumberLabel(int number) {
    return 'Order #$number';
  }

  @override
  String get orderPaidBadge => '💰 Paid';

  @override
  String get ordersEmpty => 'No orders yet';

  @override
  String get ordersEmptyFiltered => 'No orders match your filter';

  @override
  String get commonTotal => 'Total';

  @override
  String get orderDetailTitle => 'Order';

  @override
  String get orderPaymentPaid => 'Paid';

  @override
  String get orderPaymentPending => 'Payment pending';

  @override
  String get orderSectionCustomer => 'Customer';

  @override
  String get orderSectionItems => 'Items';

  @override
  String get orderSectionDelivery => 'Delivery';

  @override
  String get orderSectionNotes => 'Notes';

  @override
  String get orderSectionResponses => 'Customer responses';

  @override
  String get orderSectionTimeline => 'Timeline';

  @override
  String get orderTimelinePlaced => 'Order placed';

  @override
  String get orderTimelineReady => 'Ready for pickup / delivery';

  @override
  String get orderTimelinePaymentConfirmed => 'Payment confirmed';

  @override
  String get orderConfirmPayment => 'Confirm Payment';

  @override
  String get orderStartPreparing => 'Start Preparing';

  @override
  String get orderMarkReady => 'Mark as Ready';

  @override
  String get orderMarkDelivered => 'Mark as Delivered';

  @override
  String get orderCancel => 'Cancel Order';

  @override
  String get orderPaymentAlreadyConfirmed => 'Payment already confirmed';

  @override
  String get orderCancelTitle => 'Cancel order?';

  @override
  String get orderCancelConfirm => 'This action cannot be undone.';

  @override
  String get orderKeep => 'Keep';

  @override
  String get customersTitle => 'Customers';

  @override
  String get customersSearchHint => 'Search by name, @handle or phone';

  @override
  String get customersEmpty => 'No customers yet';

  @override
  String get customersEmptyFiltered => 'No customers match your search';

  @override
  String get customersEmptyHint =>
      'Customers are added when they order through the bot';

  @override
  String get customerDetailTitle => 'Customer';

  @override
  String get customerAddTag => 'Add tag';

  @override
  String get customerTagHint => 'Tag label (e.g. VIP, Cake lover)';

  @override
  String get customerSetStage => 'Set pipeline stage';

  @override
  String get customerNoStage => 'No stage';

  @override
  String get customerSetStageShort => 'Set stage';

  @override
  String customerSince(String date) {
    return 'Since $date';
  }

  @override
  String get customerStatOrders => 'Orders';

  @override
  String get customerStatTotalSpent => 'Total spent';

  @override
  String get customerStatLastOrder => 'Last order';

  @override
  String customerDaysAgo(int days) {
    return '${days}d ago';
  }

  @override
  String get customerAddReminder => 'Add reminder';

  @override
  String get customerReminderHint => 'Note (e.g. Follow up on order #12)';

  @override
  String get customerSaveReminder => 'Save reminder';

  @override
  String get customerNoReminders => 'No reminders. Tap + to add a follow-up.';

  @override
  String get customerNotesLabel => 'NOTES';

  @override
  String get customerNotesHint => 'Add notes about this customer…';

  @override
  String get customerNoNotes => 'No notes yet. Tap edit to add one.';

  @override
  String get customerCustomFields => 'CUSTOM FIELDS';

  @override
  String get customerNoCustomFields =>
      'No custom fields defined. Add fields in Settings.';

  @override
  String get customerTapToSet => 'Tap to set';

  @override
  String get customerOrderHistory => 'ORDER HISTORY';

  @override
  String get customerLoadError => 'Could not load customer';

  @override
  String get customerLoadErrorHint => 'Check your connection and try again';

  @override
  String get catalogTitle => 'Catalog';

  @override
  String catalogPrepTime(String time) {
    return 'Prep: $time';
  }

  @override
  String get catalogEmpty => 'No products yet';

  @override
  String get catalogEmptyHint => 'Tap + to add your first product';

  @override
  String get stockUnlimited => 'Unlimited';

  @override
  String get stockNoInfo => 'No stock info';

  @override
  String get stockOut => 'Out of stock';

  @override
  String stockIn(int count) {
    return 'In stock: $count';
  }

  @override
  String get productFormNewTitle => 'New Product';

  @override
  String get productFormEditTitle => 'Edit Product';

  @override
  String get productFormNameLabel => 'Product name *';

  @override
  String get productFormNameHint => 'e.g. Chocolate Cake';

  @override
  String get productFormNameRequired => 'Name is required';

  @override
  String get productFormPriceLabel => 'Price *';

  @override
  String get productFormPriceRequired => 'Price is required';

  @override
  String get productFormPriceInvalid => 'Enter a valid price';

  @override
  String get productFormDescLabel => 'Description';

  @override
  String get productFormDescHint => 'Optional product description';

  @override
  String get productFormStockLabel => 'Stock quantity';

  @override
  String get productFormStockHint => 'e.g. 10';

  @override
  String get productFormStockInvalid => 'Enter 0 or more';

  @override
  String get productFormTimeLabel => 'Time';

  @override
  String get productFormUnitLabel => 'Unit';

  @override
  String get prepUnitMinutes => 'Minutes';

  @override
  String get prepUnitHours => 'Hours';

  @override
  String get prepUnitDays => 'Days';

  @override
  String get prepUnitWeeks => 'Weeks';

  @override
  String get productFormActiveOn => 'Product is visible in the bot catalog';

  @override
  String get productFormActiveOff => 'Product is hidden from customers';

  @override
  String get productFormCreate => 'Create product';

  @override
  String get formRequired => 'Required';

  @override
  String get formPositiveInteger => 'Enter a positive integer';

  @override
  String durationMinutes(int min) {
    return '$min min';
  }

  @override
  String get servicesTitle => 'Services';

  @override
  String get servicesEmpty => 'No services yet. Tap + to add one.';

  @override
  String get serviceFormNewTitle => 'New service';

  @override
  String get serviceFormEditTitle => 'Edit service';

  @override
  String get serviceFormNameLabel => 'Service name';

  @override
  String get serviceFormDurationLabel => 'Duration (minutes)';

  @override
  String get serviceFormPriceLabel => 'Price (UZS)';

  @override
  String get serviceFormActiveSubtitle => 'Visible to customers in the bot';

  @override
  String get staffTitle => 'Staff';

  @override
  String get staffEmpty => 'No staff yet. Tap + to add one.';

  @override
  String get staffNoServices => 'No services assigned';

  @override
  String get staffFormNewTitle => 'New staff member';

  @override
  String get staffFormEditTitle => 'Edit staff member';

  @override
  String staffDeleteTitle(String name) {
    return 'Delete $name?';
  }

  @override
  String get staffThisMember => 'this staff member';

  @override
  String get staffDeleteConfirm => 'This cannot be undone.';

  @override
  String get staffFormNameLabel => 'Full name';

  @override
  String get staffFormTelegramLabel => 'Telegram handle (optional)';

  @override
  String get staffFormServicesLabel => 'Services performed';

  @override
  String get staffNoServicesAvailable =>
      'No services available. Add services first.';

  @override
  String get staffSelectService => 'Select at least one service';

  @override
  String get appointmentsTitle => 'Appointments';

  @override
  String get apptTomorrow => 'Tomorrow';

  @override
  String get apptEmpty => 'No appointments on this day';

  @override
  String get apptEmptyHint => 'Use the + button to add one';

  @override
  String get apptDetailTitle => 'Appointment';

  @override
  String get apptPayInAdvance => 'Pay in advance';

  @override
  String get apptPayAtAppointment => 'Pay at appointment';

  @override
  String get apptNotesHint => 'Add notes…';

  @override
  String get apptNoNotes => 'No notes';

  @override
  String get apptConfirmPayment => 'Confirm payment received';

  @override
  String get apptConfirm => 'Confirm appointment';

  @override
  String get apptMarkCompleted => 'Mark as completed';

  @override
  String get apptMarkNoShow => 'Mark as no-show';

  @override
  String get apptCancel => 'Cancel appointment';

  @override
  String get apptFormTitle => 'New appointment';

  @override
  String get apptFormCustomerLabel => 'Customer *';

  @override
  String get apptFormSelectExisting => 'Select existing';

  @override
  String get apptFormEnterManually => 'Enter manually';

  @override
  String get apptFormSelectCustomer => 'Select a customer';

  @override
  String get apptFormCustomerNameLabel => 'Customer name';

  @override
  String get apptFormCustomerNameHint => 'Enter customer name';

  @override
  String get apptFormServiceLabel => 'Service *';

  @override
  String get apptFormFromServices => 'From my services';

  @override
  String get apptFormServiceField => 'Service';

  @override
  String get apptFormSelectService => 'Select a service';

  @override
  String get apptFormServiceNameHint => 'e.g. Haircut, Consultation, Lesson';

  @override
  String get apptFormDurationLabel => 'Duration (min)';

  @override
  String get apptFormStaffLabel => 'Staff member';

  @override
  String get apptFormAnyStaff => 'Any available';

  @override
  String get apptFormWhenLabel => 'When *';

  @override
  String get apptFormDateLabel => 'Date';

  @override
  String get apptFormSelectDate => 'Select date';

  @override
  String get apptFormSelectTime => 'Select time';

  @override
  String get apptFormPaymentLabel => 'Payment';

  @override
  String get apptFormNotesHint => 'Any notes about this appointment...';

  @override
  String get apptFormCreate => 'Create appointment';

  @override
  String get apptErrSelectCustomer => 'Select a customer';

  @override
  String get apptErrEnterCustomer => 'Enter a customer name';

  @override
  String get apptErrSelectService => 'Select a service';

  @override
  String get apptErrEnterService => 'Enter a service name';

  @override
  String get apptErrSelectDateTime => 'Select date and time';

  @override
  String get projectsTitle => 'Projects';

  @override
  String get projectsFilterProposal => 'Proposal';

  @override
  String get projectsFilterReview => 'Review';

  @override
  String get projectsEmpty => 'No projects yet';

  @override
  String projectsMilestoneCount(int done, int total) {
    return '$done/$total milestones';
  }

  @override
  String get projectDetailTitle => 'Project';

  @override
  String get projectMarkInProgress => 'Mark as in progress';

  @override
  String get projectSendForReview => 'Send for review';

  @override
  String get projectMarkCompleted => 'Mark as completed';

  @override
  String get projectCancelProject => 'Cancel project';

  @override
  String projectStatusUpdated(String status) {
    return 'Status updated to $status';
  }

  @override
  String get projectClient => 'Client';

  @override
  String get projectPhone => 'Phone';

  @override
  String get projectStart => 'Start';

  @override
  String get projectDeadline => 'Deadline';

  @override
  String get projectScope => 'Scope of work';

  @override
  String get projectPaymentTerms => 'Payment terms';

  @override
  String get projectProposalCopied => 'Proposal link copied to clipboard';

  @override
  String get projectShareProposal => 'Share proposal link';

  @override
  String get projectMilestones => 'Milestones';

  @override
  String get projectNoMilestones => 'No milestones yet';

  @override
  String get milestoneAwaitingReview => 'Awaiting client review';

  @override
  String get milestoneApprovedByClient => 'Approved by client';

  @override
  String projectDuePrefix(String date) {
    return 'Due $date';
  }

  @override
  String get projectResetMilestone => 'Reset milestone';

  @override
  String projectResetMilestoneBody(String name) {
    return 'Reset \"$name\" back to Pending?\n\nThis is for testing — the client will not be notified.';
  }

  @override
  String get projectResetToPending => 'Reset to pending';

  @override
  String get projectSubmitForReview => 'Submit for client review';

  @override
  String get projectWaitingApproval => 'Waiting for client approval';

  @override
  String get projectMarkPaymentReceived => 'Mark payment received';

  @override
  String get projectInvoices => 'Invoices';

  @override
  String get projectGenerate => 'Generate';

  @override
  String get projectNoInvoices => 'No invoices yet';

  @override
  String get projectInvoiceCopied => 'Invoice link copied to clipboard';

  @override
  String get projectMarkPaid => 'Mark paid';

  @override
  String get projectGenerateInvoice => 'Generate invoice';

  @override
  String get projectQty => 'Qty';

  @override
  String get projectUnitPrice => 'Unit price (UZS)';

  @override
  String get projectDueDateLabel => 'Due date (YYYY-MM-DD)';

  @override
  String get projectFormTitle => 'New project';

  @override
  String get projectSelectClient => 'Select a client';

  @override
  String get projectClientNameLabel => 'Client name';

  @override
  String get projectClientNameHint => 'Enter client name';

  @override
  String get projectNameLabel => 'Project name';

  @override
  String get projectNameHint => 'e.g. Brand identity redesign';

  @override
  String get projectScopeHint => 'Describe deliverables...';

  @override
  String get projectPriceLabel => 'Total agreed price (UZS)';

  @override
  String get projectTermsHint => 'e.g. 50% upfront, 50% on delivery';

  @override
  String get projectStartDate => 'Start date';

  @override
  String get projectFormCreate => 'Create project';

  @override
  String get projectErrSelectClient => 'Please select a client';

  @override
  String get projectErrEnterClient => 'Enter a client name';

  @override
  String get projectErrNameRequired => 'Project name is required';

  @override
  String get milestoneFormTitle => 'Add milestone';

  @override
  String get milestoneAdd => 'Add milestone';

  @override
  String get milestoneNameLabel => 'Milestone name';

  @override
  String get milestoneNameHint => 'e.g. Initial design mockups';

  @override
  String get milestoneAmountLabel => 'Amount (UZS)';

  @override
  String get milestoneDueDateLabel => 'Due date';

  @override
  String get milestoneAmountInvalid => 'Enter a valid amount';

  @override
  String get analyticsTitle => 'Analytics';

  @override
  String get analyticsNoDataLastMonth => 'No data last month';

  @override
  String analyticsVsLastMonth(String change) {
    return '$change% vs last month';
  }

  @override
  String get analyticsRevenueThisMonth => 'Revenue this month';

  @override
  String analyticsLastMonth(String amount) {
    return 'Last month: $amount';
  }

  @override
  String get analyticsCompletedThisMonth => 'Completed\nthis month';

  @override
  String get analyticsAvgOrderValue => 'Avg order\nvalue';

  @override
  String get analyticsPendingPayments => 'Pending payments';

  @override
  String get analyticsAllReceived => 'All payments received';

  @override
  String get analyticsTopCustomers => 'TOP CUSTOMERS — LAST 90 DAYS';

  @override
  String get analyticsNoConfirmedOrders =>
      'No confirmed orders in the last 90 days';

  @override
  String get analyticsBestSelling => 'BEST SELLING PRODUCT';

  @override
  String analyticsUnitsSold(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count units sold',
      one: '1 unit sold',
    );
    return '$_temp0';
  }

  @override
  String get schedulingWorkingHours => 'Working hours';

  @override
  String get schedulingWorkingHoursHint =>
      'When customers can book. Times are Tashkent time, 24-hour.';

  @override
  String get schedulingOpen => 'Open';

  @override
  String get schedulingClosed => 'Closed';

  @override
  String get schedulingDayMon => 'Monday';

  @override
  String get schedulingDayTue => 'Tuesday';

  @override
  String get schedulingDayWed => 'Wednesday';

  @override
  String get schedulingDayThu => 'Thursday';

  @override
  String get schedulingDayFri => 'Friday';

  @override
  String get schedulingDaySat => 'Saturday';

  @override
  String get schedulingDaySun => 'Sunday';

  @override
  String get schedulingStart => 'Start';

  @override
  String get schedulingEnd => 'End';

  @override
  String get schedulingTimeInvalid => 'Start time must be before end time.';

  @override
  String get schedulingBuffer => 'Buffer between appointments';

  @override
  String get schedulingBufferHint =>
      'Gap added after each appointment, e.g. for cleanup.';

  @override
  String get schedulingBufferUnit => 'minutes';

  @override
  String get schedulingWorkingHoursSaved => 'Working hours saved';

  @override
  String get schedulingBlockedTime => 'Blocked time';

  @override
  String get schedulingBlockedTimeHint =>
      'Block off vacations, breaks or one-off closures so customers cannot book them.';

  @override
  String get schedulingAddBlocked => 'Add blocked time';

  @override
  String get schedulingNoBlocked => 'No blocked time';

  @override
  String get schedulingScope => 'Applies to';

  @override
  String get schedulingWholeBusiness => 'Whole business';

  @override
  String get schedulingDate => 'Date';

  @override
  String get schedulingReason => 'Reason';

  @override
  String get schedulingReasonHint => 'Optional, e.g. Public holiday';

  @override
  String get schedulingAddBlockedSubmit => 'Add block';

  @override
  String get schedulingDeleteBlockedTitle => 'Delete blocked time?';

  @override
  String get schedulingDeleteBlockedConfirm =>
      'This time will become bookable again.';

  @override
  String get staffFormDaysOffLabel => 'Days off';

  @override
  String get staffFormDaysOffHint =>
      'Specific dates this staff member is unavailable.';

  @override
  String get staffFormAddDayOff => 'Add day off';

  @override
  String get settingsModeSwitchTitle => 'Switch business type?';

  @override
  String settingsModeSwitchBody(String from, String to, String data) {
    return 'Switching from $from to $to will change your whole workspace. Your existing $data will no longer be shown or managed, though they are not deleted. Your customers stay. This cannot be partially undone — you’d have to switch back to see them again. Are you sure?';
  }

  @override
  String settingsModeSwitchConfirm(String to) {
    return 'Switch to $to';
  }

  @override
  String get settingsModeNameServices => 'Appointments';

  @override
  String get settingsModeNameFreelance => 'Projects';

  @override
  String get settingsModeDataServices => 'appointments';

  @override
  String get settingsModeDataFreelance => 'projects';
}
