import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_ru.dart';
import 'app_localizations_uz.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('ru'),
    Locale('uz')
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'Uzbek CRM'**
  String get appTitle;

  /// No description provided for @buttonSave.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get buttonSave;

  /// No description provided for @buttonSaveChanges.
  ///
  /// In en, this message translates to:
  /// **'Save changes'**
  String get buttonSaveChanges;

  /// No description provided for @buttonCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get buttonCancel;

  /// No description provided for @buttonDelete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get buttonDelete;

  /// No description provided for @buttonEdit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get buttonEdit;

  /// No description provided for @buttonAdd.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get buttonAdd;

  /// No description provided for @buttonCreate.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get buttonCreate;

  /// No description provided for @buttonConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get buttonConfirm;

  /// No description provided for @buttonContinue.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get buttonContinue;

  /// No description provided for @buttonBack.
  ///
  /// In en, this message translates to:
  /// **'Back'**
  String get buttonBack;

  /// No description provided for @buttonRetry.
  ///
  /// In en, this message translates to:
  /// **'Try again'**
  String get buttonRetry;

  /// No description provided for @buttonClose.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get buttonClose;

  /// No description provided for @buttonDone.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get buttonDone;

  /// No description provided for @buttonNext.
  ///
  /// In en, this message translates to:
  /// **'Next'**
  String get buttonNext;

  /// No description provided for @buttonShare.
  ///
  /// In en, this message translates to:
  /// **'Share'**
  String get buttonShare;

  /// No description provided for @buttonCopy.
  ///
  /// In en, this message translates to:
  /// **'Copy'**
  String get buttonCopy;

  /// No description provided for @commonSearch.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get commonSearch;

  /// No description provided for @commonLoading.
  ///
  /// In en, this message translates to:
  /// **'Loading'**
  String get commonLoading;

  /// No description provided for @commonToday.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get commonToday;

  /// No description provided for @commonYesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get commonYesterday;

  /// No description provided for @commonActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get commonActive;

  /// No description provided for @commonPaused.
  ///
  /// In en, this message translates to:
  /// **'Paused'**
  String get commonPaused;

  /// No description provided for @commonOptional.
  ///
  /// In en, this message translates to:
  /// **'optional'**
  String get commonOptional;

  /// No description provided for @commonOptionalLabel.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get commonOptionalLabel;

  /// No description provided for @commonRequired.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get commonRequired;

  /// No description provided for @commonYes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get commonYes;

  /// No description provided for @commonNo.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get commonNo;

  /// No description provided for @commonAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get commonAll;

  /// No description provided for @commonNone.
  ///
  /// In en, this message translates to:
  /// **'None'**
  String get commonNone;

  /// No description provided for @errorGeneric.
  ///
  /// In en, this message translates to:
  /// **'Something went wrong'**
  String get errorGeneric;

  /// No description provided for @errorLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load'**
  String get errorLoadFailed;

  /// No description provided for @errorWithMessage.
  ///
  /// In en, this message translates to:
  /// **'Error: {message}'**
  String errorWithMessage(String message);

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navHome;

  /// No description provided for @navCustomers.
  ///
  /// In en, this message translates to:
  /// **'Customers'**
  String get navCustomers;

  /// No description provided for @navOrders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get navOrders;

  /// No description provided for @navCatalog.
  ///
  /// In en, this message translates to:
  /// **'Catalog'**
  String get navCatalog;

  /// No description provided for @navAppointments.
  ///
  /// In en, this message translates to:
  /// **'Appointments'**
  String get navAppointments;

  /// No description provided for @navServices.
  ///
  /// In en, this message translates to:
  /// **'Services'**
  String get navServices;

  /// No description provided for @navStaff.
  ///
  /// In en, this message translates to:
  /// **'Staff'**
  String get navStaff;

  /// No description provided for @navProjects.
  ///
  /// In en, this message translates to:
  /// **'Projects'**
  String get navProjects;

  /// No description provided for @navAnalytics.
  ///
  /// In en, this message translates to:
  /// **'Analytics'**
  String get navAnalytics;

  /// No description provided for @navSettings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get navSettings;

  /// No description provided for @navMessages.
  ///
  /// In en, this message translates to:
  /// **'Messages'**
  String get navMessages;

  /// No description provided for @orderStatusNew.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get orderStatusNew;

  /// No description provided for @orderStatusPreparing.
  ///
  /// In en, this message translates to:
  /// **'Preparing'**
  String get orderStatusPreparing;

  /// No description provided for @orderStatusReady.
  ///
  /// In en, this message translates to:
  /// **'Ready'**
  String get orderStatusReady;

  /// No description provided for @orderStatusDelivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get orderStatusDelivered;

  /// No description provided for @orderStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get orderStatusCancelled;

  /// No description provided for @paymentStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get paymentStatusPending;

  /// No description provided for @paymentStatusPaymentReceived.
  ///
  /// In en, this message translates to:
  /// **'Payment received'**
  String get paymentStatusPaymentReceived;

  /// No description provided for @paymentStatusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get paymentStatusConfirmed;

  /// No description provided for @appointmentStatusRequested.
  ///
  /// In en, this message translates to:
  /// **'Requested'**
  String get appointmentStatusRequested;

  /// No description provided for @appointmentStatusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get appointmentStatusConfirmed;

  /// No description provided for @appointmentStatusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get appointmentStatusCompleted;

  /// No description provided for @appointmentStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get appointmentStatusCancelled;

  /// No description provided for @appointmentStatusNoShow.
  ///
  /// In en, this message translates to:
  /// **'No-show'**
  String get appointmentStatusNoShow;

  /// No description provided for @projectStatusProposalSent.
  ///
  /// In en, this message translates to:
  /// **'Proposal sent'**
  String get projectStatusProposalSent;

  /// No description provided for @projectStatusInProgress.
  ///
  /// In en, this message translates to:
  /// **'In progress'**
  String get projectStatusInProgress;

  /// No description provided for @projectStatusReview.
  ///
  /// In en, this message translates to:
  /// **'In review'**
  String get projectStatusReview;

  /// No description provided for @projectStatusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get projectStatusCompleted;

  /// No description provided for @projectStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get projectStatusCancelled;

  /// No description provided for @milestoneStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get milestoneStatusPending;

  /// No description provided for @milestoneStatusSubmittedForReview.
  ///
  /// In en, this message translates to:
  /// **'Submitted for review'**
  String get milestoneStatusSubmittedForReview;

  /// No description provided for @milestoneStatusApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get milestoneStatusApproved;

  /// No description provided for @milestoneStatusPaymentReceived.
  ///
  /// In en, this message translates to:
  /// **'Payment received'**
  String get milestoneStatusPaymentReceived;

  /// No description provided for @invoiceStatusUnpaid.
  ///
  /// In en, this message translates to:
  /// **'Unpaid'**
  String get invoiceStatusUnpaid;

  /// No description provided for @invoiceStatusPaid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get invoiceStatusPaid;

  /// No description provided for @deliveryMethodPickup.
  ///
  /// In en, this message translates to:
  /// **'Pickup'**
  String get deliveryMethodPickup;

  /// No description provided for @deliveryMethodDelivery.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get deliveryMethodDelivery;

  /// No description provided for @loginWelcomeTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome'**
  String get loginWelcomeTitle;

  /// No description provided for @loginWelcomeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sign in to manage your business'**
  String get loginWelcomeSubtitle;

  /// No description provided for @loginPhoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Phone number'**
  String get loginPhoneLabel;

  /// No description provided for @loginPhoneHint.
  ///
  /// In en, this message translates to:
  /// **'90 123 45 67'**
  String get loginPhoneHint;

  /// No description provided for @loginContinueButton.
  ///
  /// In en, this message translates to:
  /// **'Continue'**
  String get loginContinueButton;

  /// No description provided for @loginOtpHint.
  ///
  /// In en, this message translates to:
  /// **'A 4-digit code will be sent to your number'**
  String get loginOtpHint;

  /// No description provided for @loginErrorInvalidPhone.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid phone number'**
  String get loginErrorInvalidPhone;

  /// No description provided for @otpTitle.
  ///
  /// In en, this message translates to:
  /// **'Enter the code'**
  String get otpTitle;

  /// No description provided for @otpSubtitle.
  ///
  /// In en, this message translates to:
  /// **'We sent a code to {phone}'**
  String otpSubtitle(String phone);

  /// No description provided for @otpCodeLabel.
  ///
  /// In en, this message translates to:
  /// **'Verification code'**
  String get otpCodeLabel;

  /// No description provided for @otpVerifyButton.
  ///
  /// In en, this message translates to:
  /// **'Verify'**
  String get otpVerifyButton;

  /// No description provided for @otpResendButton.
  ///
  /// In en, this message translates to:
  /// **'Resend code'**
  String get otpResendButton;

  /// No description provided for @otpCodeResent.
  ///
  /// In en, this message translates to:
  /// **'Code resent'**
  String get otpCodeResent;

  /// No description provided for @otpDevHint.
  ///
  /// In en, this message translates to:
  /// **'Use 1234 in development'**
  String get otpDevHint;

  /// No description provided for @otpErrorInvalid.
  ///
  /// In en, this message translates to:
  /// **'Invalid code, try again'**
  String get otpErrorInvalid;

  /// No description provided for @consentGeneral.
  ///
  /// In en, this message translates to:
  /// **'I have read the Privacy Policy and consent to the processing of my personal data in accordance with the Law of the Republic of Uzbekistan \"On Personal Data\".'**
  String get consentGeneral;

  /// No description provided for @consentGeneralLink.
  ///
  /// In en, this message translates to:
  /// **'Privacy Policy'**
  String get consentGeneralLink;

  /// No description provided for @consentCrossBorder.
  ///
  /// In en, this message translates to:
  /// **'I consent to the storage and transfer of my personal data on servers located outside Uzbekistan (Railway, Cloudflare).'**
  String get consentCrossBorder;

  /// No description provided for @arrivalTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome to your CRM'**
  String get arrivalTitle;

  /// No description provided for @arrivalSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Manage your business — all in one place.'**
  String get arrivalSubtitle;

  /// No description provided for @arrivalLogIn.
  ///
  /// In en, this message translates to:
  /// **'Log in'**
  String get arrivalLogIn;

  /// No description provided for @arrivalSignUp.
  ///
  /// In en, this message translates to:
  /// **'Sign up'**
  String get arrivalSignUp;

  /// No description provided for @loginReturningTitle.
  ///
  /// In en, this message translates to:
  /// **'Welcome back'**
  String get loginReturningTitle;

  /// No description provided for @loginPhoneSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enter your phone number — we\'ll send a code to your Telegram.'**
  String get loginPhoneSubtitle;

  /// No description provided for @loginSendCodeButton.
  ///
  /// In en, this message translates to:
  /// **'Send code'**
  String get loginSendCodeButton;

  /// No description provided for @loginCodeSentNotice.
  ///
  /// In en, this message translates to:
  /// **'If an account exists, we\'ve sent a 6-digit code to your Telegram.'**
  String get loginCodeSentNotice;

  /// No description provided for @loginTooManyAttempts.
  ///
  /// In en, this message translates to:
  /// **'Too many attempts. Please try again in a few minutes.'**
  String get loginTooManyAttempts;

  /// No description provided for @loginSendFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not send the code. Check your number and try again.'**
  String get loginSendFailed;

  /// No description provided for @loginChangeNumber.
  ///
  /// In en, this message translates to:
  /// **'Change number'**
  String get loginChangeNumber;

  /// No description provided for @onboardingVerifyHeader.
  ///
  /// In en, this message translates to:
  /// **'Verify via Telegram'**
  String get onboardingVerifyHeader;

  /// No description provided for @onboardingVerifyTitle.
  ///
  /// In en, this message translates to:
  /// **'One last step to secure your account'**
  String get onboardingVerifyTitle;

  /// No description provided for @onboardingVerifyStep1.
  ///
  /// In en, this message translates to:
  /// **'Tap \"Connect Telegram\" to open our bot'**
  String get onboardingVerifyStep1;

  /// No description provided for @onboardingVerifyStep2.
  ///
  /// In en, this message translates to:
  /// **'Tap \"Share my phone number\" in the chat'**
  String get onboardingVerifyStep2;

  /// No description provided for @onboardingVerifyStep3.
  ///
  /// In en, this message translates to:
  /// **'Enter the 6-digit code the bot sends you'**
  String get onboardingVerifyStep3;

  /// No description provided for @onboardingConnectTelegram.
  ///
  /// In en, this message translates to:
  /// **'Connect Telegram'**
  String get onboardingConnectTelegram;

  /// No description provided for @onboardingConnectPreparing.
  ///
  /// In en, this message translates to:
  /// **'Preparing…'**
  String get onboardingConnectPreparing;

  /// No description provided for @onboardingGetNewLink.
  ///
  /// In en, this message translates to:
  /// **'Get a new link'**
  String get onboardingGetNewLink;

  /// No description provided for @onboardingCodeLabel.
  ///
  /// In en, this message translates to:
  /// **'6-digit code'**
  String get onboardingCodeLabel;

  /// No description provided for @onboardingVerifyLaunch.
  ///
  /// In en, this message translates to:
  /// **'Verify & launch'**
  String get onboardingVerifyLaunch;

  /// No description provided for @onboardingVerifyingLabel.
  ///
  /// In en, this message translates to:
  /// **'Verifying…'**
  String get onboardingVerifyingLabel;

  /// No description provided for @onboardingLinkExpiredError.
  ///
  /// In en, this message translates to:
  /// **'Your verification link expired. Tap \"Connect Telegram\" to get a new one.'**
  String get onboardingLinkExpiredError;

  /// No description provided for @onboardingInvalidCodeError.
  ///
  /// In en, this message translates to:
  /// **'Invalid or expired code. Please check and try again.'**
  String get onboardingInvalidCodeError;

  /// No description provided for @onboardingEnrollStartError.
  ///
  /// In en, this message translates to:
  /// **'Could not start Telegram verification. Please try again.'**
  String get onboardingEnrollStartError;

  /// No description provided for @onboardingBusinessStepTitle.
  ///
  /// In en, this message translates to:
  /// **'Tell us about your business'**
  String get onboardingBusinessStepTitle;

  /// No description provided for @onboardingBusinessNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Business name'**
  String get onboardingBusinessNameLabel;

  /// No description provided for @onboardingBusinessNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Laylo Cakes'**
  String get onboardingBusinessNameHint;

  /// No description provided for @onboardingModeTitle.
  ///
  /// In en, this message translates to:
  /// **'What does your business do?'**
  String get onboardingModeTitle;

  /// No description provided for @onboardingModeProducts.
  ///
  /// In en, this message translates to:
  /// **'Sell products'**
  String get onboardingModeProducts;

  /// No description provided for @onboardingModeProductsDesc.
  ///
  /// In en, this message translates to:
  /// **'Cakes, clothes, handmade goods'**
  String get onboardingModeProductsDesc;

  /// No description provided for @onboardingModeServices.
  ///
  /// In en, this message translates to:
  /// **'Offer services'**
  String get onboardingModeServices;

  /// No description provided for @onboardingModeServicesDesc.
  ///
  /// In en, this message translates to:
  /// **'Salon, tutoring, appointments'**
  String get onboardingModeServicesDesc;

  /// No description provided for @onboardingModeFreelance.
  ///
  /// In en, this message translates to:
  /// **'Freelance projects'**
  String get onboardingModeFreelance;

  /// No description provided for @onboardingModeFreelanceDesc.
  ///
  /// In en, this message translates to:
  /// **'Design, video, development'**
  String get onboardingModeFreelanceDesc;

  /// No description provided for @onboardingBotStepTitle.
  ///
  /// In en, this message translates to:
  /// **'Connect your Telegram bot'**
  String get onboardingBotStepTitle;

  /// No description provided for @onboardingBotTokenLabel.
  ///
  /// In en, this message translates to:
  /// **'Bot token'**
  String get onboardingBotTokenLabel;

  /// No description provided for @onboardingBotTokenHint.
  ///
  /// In en, this message translates to:
  /// **'Paste the token from BotFather'**
  String get onboardingBotTokenHint;

  /// No description provided for @onboardingPaymentStepTitle.
  ///
  /// In en, this message translates to:
  /// **'How will customers pay?'**
  String get onboardingPaymentStepTitle;

  /// No description provided for @onboardingReviewStepTitle.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get onboardingReviewStepTitle;

  /// No description provided for @onboardingDoneTitle.
  ///
  /// In en, this message translates to:
  /// **'You\'re all set!'**
  String get onboardingDoneTitle;

  /// No description provided for @onboardingDoneSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your business is ready to receive orders'**
  String get onboardingDoneSubtitle;

  /// No description provided for @onboardingDoneShareHint.
  ///
  /// In en, this message translates to:
  /// **'Your CRM is ready. Share your bot link with customers.'**
  String get onboardingDoneShareHint;

  /// No description provided for @onboardingFinishButton.
  ///
  /// In en, this message translates to:
  /// **'Go to dashboard'**
  String get onboardingFinishButton;

  /// No description provided for @onboardingSetupTitle.
  ///
  /// In en, this message translates to:
  /// **'Set up your business'**
  String get onboardingSetupTitle;

  /// No description provided for @onboardingBusinessType.
  ///
  /// In en, this message translates to:
  /// **'Business type'**
  String get onboardingBusinessType;

  /// No description provided for @onboardingLanguageLabel.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get onboardingLanguageLabel;

  /// No description provided for @onboardingModeProductsTitle.
  ///
  /// In en, this message translates to:
  /// **'Product selling'**
  String get onboardingModeProductsTitle;

  /// No description provided for @onboardingModeProductsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Sell via Telegram bot'**
  String get onboardingModeProductsSubtitle;

  /// No description provided for @onboardingModeServicesTitle.
  ///
  /// In en, this message translates to:
  /// **'Appointments'**
  String get onboardingModeServicesTitle;

  /// No description provided for @onboardingModeServicesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'For salons, barbers, doctors, tutors'**
  String get onboardingModeServicesSubtitle;

  /// No description provided for @onboardingModeFreelanceTitle.
  ///
  /// In en, this message translates to:
  /// **'Projects'**
  String get onboardingModeFreelanceTitle;

  /// No description provided for @onboardingModeFreelanceSubtitle.
  ///
  /// In en, this message translates to:
  /// **'For freelancers, designers, influencers'**
  String get onboardingModeFreelanceSubtitle;

  /// No description provided for @onboardingModeFreelanceShort.
  ///
  /// In en, this message translates to:
  /// **'Freelance'**
  String get onboardingModeFreelanceShort;

  /// No description provided for @onboardingBotHeader.
  ///
  /// In en, this message translates to:
  /// **'Telegram Bot'**
  String get onboardingBotHeader;

  /// No description provided for @onboardingBotCreateTitle.
  ///
  /// In en, this message translates to:
  /// **'Create your Telegram bot'**
  String get onboardingBotCreateTitle;

  /// No description provided for @onboardingBotCreateSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Your customers will use this bot'**
  String get onboardingBotCreateSubtitle;

  /// No description provided for @onboardingBotStep1.
  ///
  /// In en, this message translates to:
  /// **'Open Telegram and search for @BotFather'**
  String get onboardingBotStep1;

  /// No description provided for @onboardingBotStep2.
  ///
  /// In en, this message translates to:
  /// **'Send the message: /newbot'**
  String get onboardingBotStep2;

  /// No description provided for @onboardingBotStep3.
  ///
  /// In en, this message translates to:
  /// **'Choose a name for your bot (e.g. Zulfiya Cakes)'**
  String get onboardingBotStep3;

  /// No description provided for @onboardingBotStep4.
  ///
  /// In en, this message translates to:
  /// **'Choose a username ending in _bot (e.g. zulfiya_cakes_bot)'**
  String get onboardingBotStep4;

  /// No description provided for @onboardingBotStep5.
  ///
  /// In en, this message translates to:
  /// **'Copy the token BotFather gives you'**
  String get onboardingBotStep5;

  /// No description provided for @onboardingBotPasteToken.
  ///
  /// In en, this message translates to:
  /// **'Paste your bot token'**
  String get onboardingBotPasteToken;

  /// No description provided for @onboardingVerifyToken.
  ///
  /// In en, this message translates to:
  /// **'Verify token'**
  String get onboardingVerifyToken;

  /// No description provided for @onboardingBotReady.
  ///
  /// In en, this message translates to:
  /// **'@{username} is ready!'**
  String onboardingBotReady(String username);

  /// No description provided for @onboardingPaymentHeader.
  ///
  /// In en, this message translates to:
  /// **'Payment Method'**
  String get onboardingPaymentHeader;

  /// No description provided for @onboardingPaymentSubtitle.
  ///
  /// In en, this message translates to:
  /// **'You can change this later in Settings'**
  String get onboardingPaymentSubtitle;

  /// No description provided for @onboardingCardNumberLabel.
  ///
  /// In en, this message translates to:
  /// **'Card number ({optional})'**
  String onboardingCardNumberLabel(String optional);

  /// No description provided for @onboardingSkipForNow.
  ///
  /// In en, this message translates to:
  /// **'Skip for now'**
  String get onboardingSkipForNow;

  /// No description provided for @onboardingAlmostDone.
  ///
  /// In en, this message translates to:
  /// **'Almost done!'**
  String get onboardingAlmostDone;

  /// No description provided for @onboardingSummaryType.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get onboardingSummaryType;

  /// No description provided for @onboardingSummaryBot.
  ///
  /// In en, this message translates to:
  /// **'Bot'**
  String get onboardingSummaryBot;

  /// No description provided for @onboardingSummaryPayment.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get onboardingSummaryPayment;

  /// No description provided for @onboardingNotSet.
  ///
  /// In en, this message translates to:
  /// **'Not set'**
  String get onboardingNotSet;

  /// No description provided for @onboardingLaunchCrm.
  ///
  /// In en, this message translates to:
  /// **'Launch my CRM'**
  String get onboardingLaunchCrm;

  /// No description provided for @settingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTitle;

  /// No description provided for @settingsBusinessProfile.
  ///
  /// In en, this message translates to:
  /// **'BUSINESS PROFILE'**
  String get settingsBusinessProfile;

  /// No description provided for @settingsEditProfileTooltip.
  ///
  /// In en, this message translates to:
  /// **'Edit profile'**
  String get settingsEditProfileTooltip;

  /// No description provided for @settingsDescriptionLabel.
  ///
  /// In en, this message translates to:
  /// **'Description ({optional})'**
  String settingsDescriptionLabel(String optional);

  /// No description provided for @settingsBusinessMode.
  ///
  /// In en, this message translates to:
  /// **'BUSINESS MODE'**
  String get settingsBusinessMode;

  /// No description provided for @settingsModeProductsLabel.
  ///
  /// In en, this message translates to:
  /// **'Product selling'**
  String get settingsModeProductsLabel;

  /// No description provided for @settingsModeProductsDesc.
  ///
  /// In en, this message translates to:
  /// **'Sell physical or digital products via the bot'**
  String get settingsModeProductsDesc;

  /// No description provided for @settingsModeServicesLabel.
  ///
  /// In en, this message translates to:
  /// **'Service / appointments'**
  String get settingsModeServicesLabel;

  /// No description provided for @settingsModeServicesDesc.
  ///
  /// In en, this message translates to:
  /// **'Accept bookings and manage appointments'**
  String get settingsModeServicesDesc;

  /// No description provided for @settingsModeFreelanceLabel.
  ///
  /// In en, this message translates to:
  /// **'Freelance / projects'**
  String get settingsModeFreelanceLabel;

  /// No description provided for @settingsModeFreelanceDesc.
  ///
  /// In en, this message translates to:
  /// **'Track project milestones and invoices'**
  String get settingsModeFreelanceDesc;

  /// No description provided for @settingsModeAtLeastOne.
  ///
  /// In en, this message translates to:
  /// **'You must have at least one mode active.'**
  String get settingsModeAtLeastOne;

  /// No description provided for @settingsPaymentMethod.
  ///
  /// In en, this message translates to:
  /// **'PAYMENT METHOD'**
  String get settingsPaymentMethod;

  /// No description provided for @settingsEditPaymentTooltip.
  ///
  /// In en, this message translates to:
  /// **'Edit payment'**
  String get settingsEditPaymentTooltip;

  /// No description provided for @settingsCardNumberLabel.
  ///
  /// In en, this message translates to:
  /// **'Card number'**
  String get settingsCardNumberLabel;

  /// No description provided for @settingsNoCardWarning.
  ///
  /// In en, this message translates to:
  /// **'No payment card set. Customers will not be able to pay.'**
  String get settingsNoCardWarning;

  /// No description provided for @settingsCalendarSync.
  ///
  /// In en, this message translates to:
  /// **'CALENDAR SYNC'**
  String get settingsCalendarSync;

  /// No description provided for @settingsCalendarSyncTitle.
  ///
  /// In en, this message translates to:
  /// **'Sync to my calendar'**
  String get settingsCalendarSyncTitle;

  /// No description provided for @settingsCalendarSyncSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Add appointments, deliveries and deadlines to your calendar'**
  String get settingsCalendarSyncSubtitle;

  /// No description provided for @settingsCalendarLinkLabel.
  ///
  /// In en, this message translates to:
  /// **'Your calendar link'**
  String get settingsCalendarLinkLabel;

  /// No description provided for @settingsCalendarLinkCopied.
  ///
  /// In en, this message translates to:
  /// **'Calendar link copied'**
  String get settingsCalendarLinkCopied;

  /// No description provided for @settingsCalendarSyncFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to update calendar sync'**
  String get settingsCalendarSyncFailed;

  /// No description provided for @settingsAddToGoogleCalendar.
  ///
  /// In en, this message translates to:
  /// **'Add to Google Calendar'**
  String get settingsAddToGoogleCalendar;

  /// No description provided for @settingsAddToAppleCalendar.
  ///
  /// In en, this message translates to:
  /// **'Add to Apple Calendar'**
  String get settingsAddToAppleCalendar;

  /// No description provided for @settingsCalendarSamsungNote.
  ///
  /// In en, this message translates to:
  /// **'Samsung users: add to Google Calendar — it will sync to Samsung Calendar automatically.'**
  String get settingsCalendarSamsungNote;

  /// No description provided for @settingsReminders.
  ///
  /// In en, this message translates to:
  /// **'REMINDERS'**
  String get settingsReminders;

  /// No description provided for @settingsRemindersSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Get notified before appointments, deliveries and deadlines'**
  String get settingsRemindersSubtitle;

  /// No description provided for @settingsReminderSaveFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to save reminder setting'**
  String get settingsReminderSaveFailed;

  /// No description provided for @settingsRemindersLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not load reminder settings'**
  String get settingsRemindersLoadFailed;

  /// No description provided for @settingsReminderAppointmentTitle.
  ///
  /// In en, this message translates to:
  /// **'Appointment reminders'**
  String get settingsReminderAppointmentTitle;

  /// No description provided for @settingsReminderAppointmentSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Before each appointment'**
  String get settingsReminderAppointmentSubtitle;

  /// No description provided for @settingsReminderSecondTitle.
  ///
  /// In en, this message translates to:
  /// **'Second reminder'**
  String get settingsReminderSecondTitle;

  /// No description provided for @settingsReminderSecondSubtitle.
  ///
  /// In en, this message translates to:
  /// **'A final reminder closer to the time'**
  String get settingsReminderSecondSubtitle;

  /// No description provided for @settingsReminderDeliveryTitle.
  ///
  /// In en, this message translates to:
  /// **'Delivery reminders'**
  String get settingsReminderDeliveryTitle;

  /// No description provided for @settingsReminderDeliverySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Before an order is due for delivery'**
  String get settingsReminderDeliverySubtitle;

  /// No description provided for @settingsReminderDeadlineTitle.
  ///
  /// In en, this message translates to:
  /// **'Deadline reminders'**
  String get settingsReminderDeadlineTitle;

  /// No description provided for @settingsReminderDeadlineSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Before milestones and project deadlines'**
  String get settingsReminderDeadlineSubtitle;

  /// No description provided for @settingsReminderHoursBefore.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 hour before} other{{count} hours before}}'**
  String settingsReminderHoursBefore(int count);

  /// No description provided for @settingsReminderDaysBefore.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 day before} other{{count} days before}}'**
  String settingsReminderDaysBefore(int count);

  /// No description provided for @settingsRemindersFootnote.
  ///
  /// In en, this message translates to:
  /// **'Reminders are sent to this app and your Telegram.'**
  String get settingsRemindersFootnote;

  /// No description provided for @settingsTelegramBot.
  ///
  /// In en, this message translates to:
  /// **'TELEGRAM BOT'**
  String get settingsTelegramBot;

  /// No description provided for @settingsNoBotConfigured.
  ///
  /// In en, this message translates to:
  /// **'No bot configured. Contact support to set up your bot.'**
  String get settingsNoBotConfigured;

  /// No description provided for @settingsCopyLinkTooltip.
  ///
  /// In en, this message translates to:
  /// **'Copy link'**
  String get settingsCopyLinkTooltip;

  /// No description provided for @settingsBotLinkCopied.
  ///
  /// In en, this message translates to:
  /// **'Bot link copied'**
  String get settingsBotLinkCopied;

  /// No description provided for @settingsLanguage.
  ///
  /// In en, this message translates to:
  /// **'LANGUAGE'**
  String get settingsLanguage;

  /// No description provided for @settingsLanguageFootnote.
  ///
  /// In en, this message translates to:
  /// **'This changes the app language and the language your Telegram bot uses with customers.'**
  String get settingsLanguageFootnote;

  /// No description provided for @settingsAccount.
  ///
  /// In en, this message translates to:
  /// **'ACCOUNT'**
  String get settingsAccount;

  /// No description provided for @settingsLogOut.
  ///
  /// In en, this message translates to:
  /// **'Log out'**
  String get settingsLogOut;

  /// No description provided for @settingsCustomerFields.
  ///
  /// In en, this message translates to:
  /// **'CUSTOMER FIELDS'**
  String get settingsCustomerFields;

  /// No description provided for @settingsAddFieldTooltip.
  ///
  /// In en, this message translates to:
  /// **'Add field'**
  String get settingsAddFieldTooltip;

  /// No description provided for @settingsNoCustomFields.
  ///
  /// In en, this message translates to:
  /// **'No custom fields. Add fields to collect extra info about customers.'**
  String get settingsNoCustomFields;

  /// No description provided for @settingsAddCustomerField.
  ///
  /// In en, this message translates to:
  /// **'Add customer field'**
  String get settingsAddCustomerField;

  /// No description provided for @settingsFieldNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Field name'**
  String get settingsFieldNameLabel;

  /// No description provided for @settingsFieldNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Company, Instagram handle'**
  String get settingsFieldNameHint;

  /// No description provided for @settingsFieldTypeLabel.
  ///
  /// In en, this message translates to:
  /// **'Field type'**
  String get settingsFieldTypeLabel;

  /// No description provided for @settingsFieldTypeText.
  ///
  /// In en, this message translates to:
  /// **'Text'**
  String get settingsFieldTypeText;

  /// No description provided for @settingsFieldTypeNumber.
  ///
  /// In en, this message translates to:
  /// **'Number'**
  String get settingsFieldTypeNumber;

  /// No description provided for @settingsFieldTypeDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get settingsFieldTypeDate;

  /// No description provided for @settingsFieldTypeYesNo.
  ///
  /// In en, this message translates to:
  /// **'Yes / No'**
  String get settingsFieldTypeYesNo;

  /// No description provided for @settingsPipelineStages.
  ///
  /// In en, this message translates to:
  /// **'PIPELINE STAGES'**
  String get settingsPipelineStages;

  /// No description provided for @settingsAddStageTooltip.
  ///
  /// In en, this message translates to:
  /// **'Add stage'**
  String get settingsAddStageTooltip;

  /// No description provided for @settingsNoStages.
  ///
  /// In en, this message translates to:
  /// **'No pipeline stages. Add stages to track where customers are in your sales process.'**
  String get settingsNoStages;

  /// No description provided for @settingsAddStage.
  ///
  /// In en, this message translates to:
  /// **'Add pipeline stage'**
  String get settingsAddStage;

  /// No description provided for @settingsStageNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Stage name'**
  String get settingsStageNameLabel;

  /// No description provided for @settingsStageNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Lead, Negotiating, Won'**
  String get settingsStageNameHint;

  /// No description provided for @settingsColorLabel.
  ///
  /// In en, this message translates to:
  /// **'Color'**
  String get settingsColorLabel;

  /// No description provided for @settingsCheckoutQuestions.
  ///
  /// In en, this message translates to:
  /// **'CHECKOUT QUESTIONS'**
  String get settingsCheckoutQuestions;

  /// No description provided for @settingsAddQuestionTooltip.
  ///
  /// In en, this message translates to:
  /// **'Add question'**
  String get settingsAddQuestionTooltip;

  /// No description provided for @settingsNoCheckoutQuestions.
  ///
  /// In en, this message translates to:
  /// **'No checkout questions. Questions are asked in the Telegram bot during checkout.'**
  String get settingsNoCheckoutQuestions;

  /// No description provided for @settingsAddCheckoutQuestion.
  ///
  /// In en, this message translates to:
  /// **'Add checkout question'**
  String get settingsAddCheckoutQuestion;

  /// No description provided for @settingsQuestionLabel.
  ///
  /// In en, this message translates to:
  /// **'Question'**
  String get settingsQuestionLabel;

  /// No description provided for @settingsQuestionHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Any allergies or special requests?'**
  String get settingsQuestionHint;

  /// No description provided for @settingsServices.
  ///
  /// In en, this message translates to:
  /// **'SERVICES'**
  String get settingsServices;

  /// No description provided for @settingsManageServices.
  ///
  /// In en, this message translates to:
  /// **'Manage services'**
  String get settingsManageServices;

  /// No description provided for @settingsStaff.
  ///
  /// In en, this message translates to:
  /// **'STAFF'**
  String get settingsStaff;

  /// No description provided for @settingsManageStaff.
  ///
  /// In en, this message translates to:
  /// **'Manage staff'**
  String get settingsManageStaff;

  /// No description provided for @homeSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search customers...'**
  String get homeSearchHint;

  /// No description provided for @homeNoCustomersFound.
  ///
  /// In en, this message translates to:
  /// **'No customers found'**
  String get homeNoCustomersFound;

  /// No description provided for @homeNoContactInfo.
  ///
  /// In en, this message translates to:
  /// **'No contact info'**
  String get homeNoContactInfo;

  /// No description provided for @homeOrdersCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 order} other{{count} orders}}'**
  String homeOrdersCount(int count);

  /// No description provided for @homeNeedsAttention.
  ///
  /// In en, this message translates to:
  /// **'Needs attention'**
  String get homeNeedsAttention;

  /// No description provided for @homeTodaysActivity.
  ///
  /// In en, this message translates to:
  /// **'Today\'s activity'**
  String get homeTodaysActivity;

  /// No description provided for @homeOverdue.
  ///
  /// In en, this message translates to:
  /// **'Overdue'**
  String get homeOverdue;

  /// No description provided for @homeDaysSilent.
  ///
  /// In en, this message translates to:
  /// **'{days}d silent'**
  String homeDaysSilent(int days);

  /// No description provided for @homeBadgeAppointment.
  ///
  /// In en, this message translates to:
  /// **'Appointment'**
  String get homeBadgeAppointment;

  /// No description provided for @homeBadgeProject.
  ///
  /// In en, this message translates to:
  /// **'Project'**
  String get homeBadgeProject;

  /// No description provided for @homeBadgeMilestone.
  ///
  /// In en, this message translates to:
  /// **'Milestone'**
  String get homeBadgeMilestone;

  /// No description provided for @homeActivityCancelled.
  ///
  /// In en, this message translates to:
  /// **'{service} — cancelled'**
  String homeActivityCancelled(String service);

  /// No description provided for @homeActivityNewProject.
  ///
  /// In en, this message translates to:
  /// **'New project • {customer}'**
  String homeActivityNewProject(String customer);

  /// No description provided for @homeActivityMilestoneApproved.
  ///
  /// In en, this message translates to:
  /// **'Approved • {project}'**
  String homeActivityMilestoneApproved(String project);

  /// No description provided for @homeNoActivity.
  ///
  /// In en, this message translates to:
  /// **'No activity today'**
  String get homeNoActivity;

  /// No description provided for @homeWelcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome'**
  String get homeWelcome;

  /// No description provided for @homeHeroTodayOrders.
  ///
  /// In en, this message translates to:
  /// **'Today\'s orders'**
  String get homeHeroTodayOrders;

  /// No description provided for @homeStatPending.
  ///
  /// In en, this message translates to:
  /// **'Pending payments'**
  String get homeStatPending;

  /// No description provided for @homeStatNewCustomers.
  ///
  /// In en, this message translates to:
  /// **'New customers'**
  String get homeStatNewCustomers;

  /// No description provided for @homePendingPaymentsCount.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No pending payments} =1{1 pending payment} other{{count} pending payments}}'**
  String homePendingPaymentsCount(int count);

  /// No description provided for @ordersTitle.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get ordersTitle;

  /// No description provided for @ordersSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search by name or order #'**
  String get ordersSearchHint;

  /// No description provided for @orderNumberLabel.
  ///
  /// In en, this message translates to:
  /// **'Order #{number}'**
  String orderNumberLabel(int number);

  /// No description provided for @orderPaidBadge.
  ///
  /// In en, this message translates to:
  /// **'💰 Paid'**
  String get orderPaidBadge;

  /// No description provided for @ordersEmpty.
  ///
  /// In en, this message translates to:
  /// **'No orders yet'**
  String get ordersEmpty;

  /// No description provided for @ordersEmptyFiltered.
  ///
  /// In en, this message translates to:
  /// **'No orders match your filter'**
  String get ordersEmptyFiltered;

  /// No description provided for @commonTotal.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get commonTotal;

  /// No description provided for @orderDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Order'**
  String get orderDetailTitle;

  /// No description provided for @orderPaymentPaid.
  ///
  /// In en, this message translates to:
  /// **'Paid'**
  String get orderPaymentPaid;

  /// No description provided for @orderPaymentPending.
  ///
  /// In en, this message translates to:
  /// **'Payment pending'**
  String get orderPaymentPending;

  /// No description provided for @orderSectionCustomer.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get orderSectionCustomer;

  /// No description provided for @orderSectionItems.
  ///
  /// In en, this message translates to:
  /// **'Items'**
  String get orderSectionItems;

  /// No description provided for @orderSectionDelivery.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get orderSectionDelivery;

  /// No description provided for @orderSectionNotes.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get orderSectionNotes;

  /// No description provided for @orderSectionResponses.
  ///
  /// In en, this message translates to:
  /// **'Customer responses'**
  String get orderSectionResponses;

  /// No description provided for @orderSectionTimeline.
  ///
  /// In en, this message translates to:
  /// **'Timeline'**
  String get orderSectionTimeline;

  /// No description provided for @orderTimelinePlaced.
  ///
  /// In en, this message translates to:
  /// **'Order placed'**
  String get orderTimelinePlaced;

  /// No description provided for @orderTimelineReady.
  ///
  /// In en, this message translates to:
  /// **'Ready for pickup / delivery'**
  String get orderTimelineReady;

  /// No description provided for @orderTimelinePaymentConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Payment confirmed'**
  String get orderTimelinePaymentConfirmed;

  /// No description provided for @orderConfirmPayment.
  ///
  /// In en, this message translates to:
  /// **'Confirm Payment'**
  String get orderConfirmPayment;

  /// No description provided for @orderStartPreparing.
  ///
  /// In en, this message translates to:
  /// **'Start Preparing'**
  String get orderStartPreparing;

  /// No description provided for @orderMarkReady.
  ///
  /// In en, this message translates to:
  /// **'Mark as Ready'**
  String get orderMarkReady;

  /// No description provided for @orderMarkDelivered.
  ///
  /// In en, this message translates to:
  /// **'Mark as Delivered'**
  String get orderMarkDelivered;

  /// No description provided for @orderCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel Order'**
  String get orderCancel;

  /// No description provided for @orderPaymentAlreadyConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Payment already confirmed'**
  String get orderPaymentAlreadyConfirmed;

  /// No description provided for @orderCancelTitle.
  ///
  /// In en, this message translates to:
  /// **'Cancel order?'**
  String get orderCancelTitle;

  /// No description provided for @orderCancelConfirm.
  ///
  /// In en, this message translates to:
  /// **'This action cannot be undone.'**
  String get orderCancelConfirm;

  /// No description provided for @orderKeep.
  ///
  /// In en, this message translates to:
  /// **'Keep'**
  String get orderKeep;

  /// No description provided for @customersTitle.
  ///
  /// In en, this message translates to:
  /// **'Customers'**
  String get customersTitle;

  /// No description provided for @customersSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search by name, @handle or phone'**
  String get customersSearchHint;

  /// No description provided for @customersEmpty.
  ///
  /// In en, this message translates to:
  /// **'No customers yet'**
  String get customersEmpty;

  /// No description provided for @customersEmptyFiltered.
  ///
  /// In en, this message translates to:
  /// **'No customers match your search'**
  String get customersEmptyFiltered;

  /// No description provided for @customersEmptyHint.
  ///
  /// In en, this message translates to:
  /// **'Customers are added when they order through the bot'**
  String get customersEmptyHint;

  /// No description provided for @customerDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get customerDetailTitle;

  /// No description provided for @customerAddTag.
  ///
  /// In en, this message translates to:
  /// **'Add tag'**
  String get customerAddTag;

  /// No description provided for @customerTagHint.
  ///
  /// In en, this message translates to:
  /// **'Tag label (e.g. VIP, Cake lover)'**
  String get customerTagHint;

  /// No description provided for @customerSetStage.
  ///
  /// In en, this message translates to:
  /// **'Set pipeline stage'**
  String get customerSetStage;

  /// No description provided for @customerNoStage.
  ///
  /// In en, this message translates to:
  /// **'No stage'**
  String get customerNoStage;

  /// No description provided for @customerSetStageShort.
  ///
  /// In en, this message translates to:
  /// **'Set stage'**
  String get customerSetStageShort;

  /// No description provided for @customerSince.
  ///
  /// In en, this message translates to:
  /// **'Since {date}'**
  String customerSince(String date);

  /// No description provided for @customerStatOrders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get customerStatOrders;

  /// No description provided for @customerStatTotalSpent.
  ///
  /// In en, this message translates to:
  /// **'Total spent'**
  String get customerStatTotalSpent;

  /// No description provided for @customerStatLastOrder.
  ///
  /// In en, this message translates to:
  /// **'Last order'**
  String get customerStatLastOrder;

  /// No description provided for @customerDaysAgo.
  ///
  /// In en, this message translates to:
  /// **'{days}d ago'**
  String customerDaysAgo(int days);

  /// No description provided for @customerAddReminder.
  ///
  /// In en, this message translates to:
  /// **'Add reminder'**
  String get customerAddReminder;

  /// No description provided for @customerReminderHint.
  ///
  /// In en, this message translates to:
  /// **'Note (e.g. Follow up on order #12)'**
  String get customerReminderHint;

  /// No description provided for @customerSaveReminder.
  ///
  /// In en, this message translates to:
  /// **'Save reminder'**
  String get customerSaveReminder;

  /// No description provided for @customerNoReminders.
  ///
  /// In en, this message translates to:
  /// **'No reminders. Tap + to add a follow-up.'**
  String get customerNoReminders;

  /// No description provided for @customerNotesLabel.
  ///
  /// In en, this message translates to:
  /// **'NOTES'**
  String get customerNotesLabel;

  /// No description provided for @customerNotesHint.
  ///
  /// In en, this message translates to:
  /// **'Add notes about this customer…'**
  String get customerNotesHint;

  /// No description provided for @customerNoNotes.
  ///
  /// In en, this message translates to:
  /// **'No notes yet. Tap edit to add one.'**
  String get customerNoNotes;

  /// No description provided for @customerCustomFields.
  ///
  /// In en, this message translates to:
  /// **'CUSTOM FIELDS'**
  String get customerCustomFields;

  /// No description provided for @customerNoCustomFields.
  ///
  /// In en, this message translates to:
  /// **'No custom fields defined. Add fields in Settings.'**
  String get customerNoCustomFields;

  /// No description provided for @customerTapToSet.
  ///
  /// In en, this message translates to:
  /// **'Tap to set'**
  String get customerTapToSet;

  /// No description provided for @customerOrderHistory.
  ///
  /// In en, this message translates to:
  /// **'ORDER HISTORY'**
  String get customerOrderHistory;

  /// No description provided for @customerLoadError.
  ///
  /// In en, this message translates to:
  /// **'Could not load customer'**
  String get customerLoadError;

  /// No description provided for @customerLoadErrorHint.
  ///
  /// In en, this message translates to:
  /// **'Check your connection and try again'**
  String get customerLoadErrorHint;

  /// No description provided for @catalogTitle.
  ///
  /// In en, this message translates to:
  /// **'Catalog'**
  String get catalogTitle;

  /// No description provided for @catalogPrepTime.
  ///
  /// In en, this message translates to:
  /// **'Prep: {time}'**
  String catalogPrepTime(String time);

  /// No description provided for @catalogEmpty.
  ///
  /// In en, this message translates to:
  /// **'No products yet'**
  String get catalogEmpty;

  /// No description provided for @catalogEmptyHint.
  ///
  /// In en, this message translates to:
  /// **'Tap + to add your first product'**
  String get catalogEmptyHint;

  /// No description provided for @stockUnlimited.
  ///
  /// In en, this message translates to:
  /// **'Unlimited'**
  String get stockUnlimited;

  /// No description provided for @stockNoInfo.
  ///
  /// In en, this message translates to:
  /// **'No stock info'**
  String get stockNoInfo;

  /// No description provided for @stockOut.
  ///
  /// In en, this message translates to:
  /// **'Out of stock'**
  String get stockOut;

  /// No description provided for @stockIn.
  ///
  /// In en, this message translates to:
  /// **'In stock: {count}'**
  String stockIn(int count);

  /// No description provided for @productFormNewTitle.
  ///
  /// In en, this message translates to:
  /// **'New Product'**
  String get productFormNewTitle;

  /// No description provided for @productFormEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit Product'**
  String get productFormEditTitle;

  /// No description provided for @productFormNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Product name *'**
  String get productFormNameLabel;

  /// No description provided for @productFormNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Chocolate Cake'**
  String get productFormNameHint;

  /// No description provided for @productFormNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Name is required'**
  String get productFormNameRequired;

  /// No description provided for @productFormPriceLabel.
  ///
  /// In en, this message translates to:
  /// **'Price *'**
  String get productFormPriceLabel;

  /// No description provided for @productFormPriceRequired.
  ///
  /// In en, this message translates to:
  /// **'Price is required'**
  String get productFormPriceRequired;

  /// No description provided for @productFormPriceInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid price'**
  String get productFormPriceInvalid;

  /// No description provided for @productFormDescLabel.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get productFormDescLabel;

  /// No description provided for @productFormDescHint.
  ///
  /// In en, this message translates to:
  /// **'Optional product description'**
  String get productFormDescHint;

  /// No description provided for @productFormStockLabel.
  ///
  /// In en, this message translates to:
  /// **'Stock quantity'**
  String get productFormStockLabel;

  /// No description provided for @productFormStockHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. 10'**
  String get productFormStockHint;

  /// No description provided for @productFormStockInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter 0 or more'**
  String get productFormStockInvalid;

  /// No description provided for @productFormTimeLabel.
  ///
  /// In en, this message translates to:
  /// **'Time'**
  String get productFormTimeLabel;

  /// No description provided for @productFormUnitLabel.
  ///
  /// In en, this message translates to:
  /// **'Unit'**
  String get productFormUnitLabel;

  /// No description provided for @prepUnitMinutes.
  ///
  /// In en, this message translates to:
  /// **'Minutes'**
  String get prepUnitMinutes;

  /// No description provided for @prepUnitHours.
  ///
  /// In en, this message translates to:
  /// **'Hours'**
  String get prepUnitHours;

  /// No description provided for @prepUnitDays.
  ///
  /// In en, this message translates to:
  /// **'Days'**
  String get prepUnitDays;

  /// No description provided for @prepUnitWeeks.
  ///
  /// In en, this message translates to:
  /// **'Weeks'**
  String get prepUnitWeeks;

  /// No description provided for @productFormActiveOn.
  ///
  /// In en, this message translates to:
  /// **'Product is visible in the bot catalog'**
  String get productFormActiveOn;

  /// No description provided for @productFormActiveOff.
  ///
  /// In en, this message translates to:
  /// **'Product is hidden from customers'**
  String get productFormActiveOff;

  /// No description provided for @productFormCreate.
  ///
  /// In en, this message translates to:
  /// **'Create product'**
  String get productFormCreate;

  /// No description provided for @formRequired.
  ///
  /// In en, this message translates to:
  /// **'Required'**
  String get formRequired;

  /// No description provided for @formPositiveInteger.
  ///
  /// In en, this message translates to:
  /// **'Enter a positive integer'**
  String get formPositiveInteger;

  /// No description provided for @durationMinutes.
  ///
  /// In en, this message translates to:
  /// **'{min} min'**
  String durationMinutes(int min);

  /// No description provided for @servicesTitle.
  ///
  /// In en, this message translates to:
  /// **'Services'**
  String get servicesTitle;

  /// No description provided for @servicesEmpty.
  ///
  /// In en, this message translates to:
  /// **'No services yet. Tap + to add one.'**
  String get servicesEmpty;

  /// No description provided for @serviceFormNewTitle.
  ///
  /// In en, this message translates to:
  /// **'New service'**
  String get serviceFormNewTitle;

  /// No description provided for @serviceFormEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit service'**
  String get serviceFormEditTitle;

  /// No description provided for @serviceFormNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Service name'**
  String get serviceFormNameLabel;

  /// No description provided for @serviceFormDurationLabel.
  ///
  /// In en, this message translates to:
  /// **'Duration (minutes)'**
  String get serviceFormDurationLabel;

  /// No description provided for @serviceFormPriceLabel.
  ///
  /// In en, this message translates to:
  /// **'Price (UZS)'**
  String get serviceFormPriceLabel;

  /// No description provided for @serviceFormActiveSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Visible to customers in the bot'**
  String get serviceFormActiveSubtitle;

  /// No description provided for @staffTitle.
  ///
  /// In en, this message translates to:
  /// **'Staff'**
  String get staffTitle;

  /// No description provided for @staffEmpty.
  ///
  /// In en, this message translates to:
  /// **'No staff yet. Tap + to add one.'**
  String get staffEmpty;

  /// No description provided for @staffNoServices.
  ///
  /// In en, this message translates to:
  /// **'No services assigned'**
  String get staffNoServices;

  /// No description provided for @staffFormNewTitle.
  ///
  /// In en, this message translates to:
  /// **'New staff member'**
  String get staffFormNewTitle;

  /// No description provided for @staffFormEditTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit staff member'**
  String get staffFormEditTitle;

  /// No description provided for @staffDeleteTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete {name}?'**
  String staffDeleteTitle(String name);

  /// No description provided for @staffThisMember.
  ///
  /// In en, this message translates to:
  /// **'this staff member'**
  String get staffThisMember;

  /// No description provided for @staffDeleteConfirm.
  ///
  /// In en, this message translates to:
  /// **'This cannot be undone.'**
  String get staffDeleteConfirm;

  /// No description provided for @staffFormNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Full name'**
  String get staffFormNameLabel;

  /// No description provided for @staffFormTelegramLabel.
  ///
  /// In en, this message translates to:
  /// **'Telegram handle (optional)'**
  String get staffFormTelegramLabel;

  /// No description provided for @staffFormServicesLabel.
  ///
  /// In en, this message translates to:
  /// **'Services performed'**
  String get staffFormServicesLabel;

  /// No description provided for @staffNoServicesAvailable.
  ///
  /// In en, this message translates to:
  /// **'No services available. Add services first.'**
  String get staffNoServicesAvailable;

  /// No description provided for @staffSelectService.
  ///
  /// In en, this message translates to:
  /// **'Select at least one service'**
  String get staffSelectService;

  /// No description provided for @appointmentsTitle.
  ///
  /// In en, this message translates to:
  /// **'Appointments'**
  String get appointmentsTitle;

  /// No description provided for @apptTomorrow.
  ///
  /// In en, this message translates to:
  /// **'Tomorrow'**
  String get apptTomorrow;

  /// No description provided for @apptEmpty.
  ///
  /// In en, this message translates to:
  /// **'No appointments on this day'**
  String get apptEmpty;

  /// No description provided for @apptEmptyHint.
  ///
  /// In en, this message translates to:
  /// **'Use the + button to add one'**
  String get apptEmptyHint;

  /// No description provided for @apptDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Appointment'**
  String get apptDetailTitle;

  /// No description provided for @apptPayInAdvance.
  ///
  /// In en, this message translates to:
  /// **'Pay in advance'**
  String get apptPayInAdvance;

  /// No description provided for @apptPayAtAppointment.
  ///
  /// In en, this message translates to:
  /// **'Pay at appointment'**
  String get apptPayAtAppointment;

  /// No description provided for @apptNotesHint.
  ///
  /// In en, this message translates to:
  /// **'Add notes…'**
  String get apptNotesHint;

  /// No description provided for @apptNoNotes.
  ///
  /// In en, this message translates to:
  /// **'No notes'**
  String get apptNoNotes;

  /// No description provided for @apptConfirmPayment.
  ///
  /// In en, this message translates to:
  /// **'Confirm payment received'**
  String get apptConfirmPayment;

  /// No description provided for @apptConfirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm appointment'**
  String get apptConfirm;

  /// No description provided for @apptMarkCompleted.
  ///
  /// In en, this message translates to:
  /// **'Mark as completed'**
  String get apptMarkCompleted;

  /// No description provided for @apptMarkNoShow.
  ///
  /// In en, this message translates to:
  /// **'Mark as no-show'**
  String get apptMarkNoShow;

  /// No description provided for @apptCancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel appointment'**
  String get apptCancel;

  /// No description provided for @apptFormTitle.
  ///
  /// In en, this message translates to:
  /// **'New appointment'**
  String get apptFormTitle;

  /// No description provided for @apptFormCustomerLabel.
  ///
  /// In en, this message translates to:
  /// **'Customer *'**
  String get apptFormCustomerLabel;

  /// No description provided for @apptFormSelectExisting.
  ///
  /// In en, this message translates to:
  /// **'Select existing'**
  String get apptFormSelectExisting;

  /// No description provided for @apptFormEnterManually.
  ///
  /// In en, this message translates to:
  /// **'Enter manually'**
  String get apptFormEnterManually;

  /// No description provided for @apptFormSelectCustomer.
  ///
  /// In en, this message translates to:
  /// **'Select a customer'**
  String get apptFormSelectCustomer;

  /// No description provided for @apptFormCustomerNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Customer name'**
  String get apptFormCustomerNameLabel;

  /// No description provided for @apptFormCustomerNameHint.
  ///
  /// In en, this message translates to:
  /// **'Enter customer name'**
  String get apptFormCustomerNameHint;

  /// No description provided for @apptFormServiceLabel.
  ///
  /// In en, this message translates to:
  /// **'Service *'**
  String get apptFormServiceLabel;

  /// No description provided for @apptFormFromServices.
  ///
  /// In en, this message translates to:
  /// **'From my services'**
  String get apptFormFromServices;

  /// No description provided for @apptFormServiceField.
  ///
  /// In en, this message translates to:
  /// **'Service'**
  String get apptFormServiceField;

  /// No description provided for @apptFormSelectService.
  ///
  /// In en, this message translates to:
  /// **'Select a service'**
  String get apptFormSelectService;

  /// No description provided for @apptFormServiceNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Haircut, Consultation, Lesson'**
  String get apptFormServiceNameHint;

  /// No description provided for @apptFormDurationLabel.
  ///
  /// In en, this message translates to:
  /// **'Duration (min)'**
  String get apptFormDurationLabel;

  /// No description provided for @apptFormStaffLabel.
  ///
  /// In en, this message translates to:
  /// **'Staff member'**
  String get apptFormStaffLabel;

  /// No description provided for @apptFormAnyStaff.
  ///
  /// In en, this message translates to:
  /// **'Any available'**
  String get apptFormAnyStaff;

  /// No description provided for @apptFormWhenLabel.
  ///
  /// In en, this message translates to:
  /// **'When *'**
  String get apptFormWhenLabel;

  /// No description provided for @apptFormDateLabel.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get apptFormDateLabel;

  /// No description provided for @apptFormSelectDate.
  ///
  /// In en, this message translates to:
  /// **'Select date'**
  String get apptFormSelectDate;

  /// No description provided for @apptFormSelectTime.
  ///
  /// In en, this message translates to:
  /// **'Select time'**
  String get apptFormSelectTime;

  /// No description provided for @apptFormPaymentLabel.
  ///
  /// In en, this message translates to:
  /// **'Payment'**
  String get apptFormPaymentLabel;

  /// No description provided for @apptFormNotesHint.
  ///
  /// In en, this message translates to:
  /// **'Any notes about this appointment...'**
  String get apptFormNotesHint;

  /// No description provided for @apptFormCreate.
  ///
  /// In en, this message translates to:
  /// **'Create appointment'**
  String get apptFormCreate;

  /// No description provided for @apptErrSelectCustomer.
  ///
  /// In en, this message translates to:
  /// **'Select a customer'**
  String get apptErrSelectCustomer;

  /// No description provided for @apptErrEnterCustomer.
  ///
  /// In en, this message translates to:
  /// **'Enter a customer name'**
  String get apptErrEnterCustomer;

  /// No description provided for @apptErrSelectService.
  ///
  /// In en, this message translates to:
  /// **'Select a service'**
  String get apptErrSelectService;

  /// No description provided for @apptErrEnterService.
  ///
  /// In en, this message translates to:
  /// **'Enter a service name'**
  String get apptErrEnterService;

  /// No description provided for @apptErrSelectDateTime.
  ///
  /// In en, this message translates to:
  /// **'Select date and time'**
  String get apptErrSelectDateTime;

  /// No description provided for @projectsTitle.
  ///
  /// In en, this message translates to:
  /// **'Projects'**
  String get projectsTitle;

  /// No description provided for @projectsFilterProposal.
  ///
  /// In en, this message translates to:
  /// **'Proposal'**
  String get projectsFilterProposal;

  /// No description provided for @projectsFilterReview.
  ///
  /// In en, this message translates to:
  /// **'Review'**
  String get projectsFilterReview;

  /// No description provided for @projectsEmpty.
  ///
  /// In en, this message translates to:
  /// **'No projects yet'**
  String get projectsEmpty;

  /// No description provided for @projectsMilestoneCount.
  ///
  /// In en, this message translates to:
  /// **'{done}/{total} milestones'**
  String projectsMilestoneCount(int done, int total);

  /// No description provided for @projectDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Project'**
  String get projectDetailTitle;

  /// No description provided for @projectMarkInProgress.
  ///
  /// In en, this message translates to:
  /// **'Mark as in progress'**
  String get projectMarkInProgress;

  /// No description provided for @projectSendForReview.
  ///
  /// In en, this message translates to:
  /// **'Send for review'**
  String get projectSendForReview;

  /// No description provided for @projectMarkCompleted.
  ///
  /// In en, this message translates to:
  /// **'Mark as completed'**
  String get projectMarkCompleted;

  /// No description provided for @projectCancelProject.
  ///
  /// In en, this message translates to:
  /// **'Cancel project'**
  String get projectCancelProject;

  /// No description provided for @projectStatusUpdated.
  ///
  /// In en, this message translates to:
  /// **'Status updated to {status}'**
  String projectStatusUpdated(String status);

  /// No description provided for @projectClient.
  ///
  /// In en, this message translates to:
  /// **'Client'**
  String get projectClient;

  /// No description provided for @projectPhone.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get projectPhone;

  /// No description provided for @projectStart.
  ///
  /// In en, this message translates to:
  /// **'Start'**
  String get projectStart;

  /// No description provided for @projectDeadline.
  ///
  /// In en, this message translates to:
  /// **'Deadline'**
  String get projectDeadline;

  /// No description provided for @projectScope.
  ///
  /// In en, this message translates to:
  /// **'Scope of work'**
  String get projectScope;

  /// No description provided for @projectPaymentTerms.
  ///
  /// In en, this message translates to:
  /// **'Payment terms'**
  String get projectPaymentTerms;

  /// No description provided for @projectProposalCopied.
  ///
  /// In en, this message translates to:
  /// **'Proposal link copied to clipboard'**
  String get projectProposalCopied;

  /// No description provided for @projectShareProposal.
  ///
  /// In en, this message translates to:
  /// **'Share proposal link'**
  String get projectShareProposal;

  /// No description provided for @projectMilestones.
  ///
  /// In en, this message translates to:
  /// **'Milestones'**
  String get projectMilestones;

  /// No description provided for @projectNoMilestones.
  ///
  /// In en, this message translates to:
  /// **'No milestones yet'**
  String get projectNoMilestones;

  /// No description provided for @milestoneAwaitingReview.
  ///
  /// In en, this message translates to:
  /// **'Awaiting client review'**
  String get milestoneAwaitingReview;

  /// No description provided for @milestoneApprovedByClient.
  ///
  /// In en, this message translates to:
  /// **'Approved by client'**
  String get milestoneApprovedByClient;

  /// No description provided for @projectDuePrefix.
  ///
  /// In en, this message translates to:
  /// **'Due {date}'**
  String projectDuePrefix(String date);

  /// No description provided for @projectResetMilestone.
  ///
  /// In en, this message translates to:
  /// **'Reset milestone'**
  String get projectResetMilestone;

  /// No description provided for @projectResetMilestoneBody.
  ///
  /// In en, this message translates to:
  /// **'Reset \"{name}\" back to Pending?\n\nThis is for testing — the client will not be notified.'**
  String projectResetMilestoneBody(String name);

  /// No description provided for @projectResetToPending.
  ///
  /// In en, this message translates to:
  /// **'Reset to pending'**
  String get projectResetToPending;

  /// No description provided for @projectSubmitForReview.
  ///
  /// In en, this message translates to:
  /// **'Submit for client review'**
  String get projectSubmitForReview;

  /// No description provided for @projectWaitingApproval.
  ///
  /// In en, this message translates to:
  /// **'Waiting for client approval'**
  String get projectWaitingApproval;

  /// No description provided for @projectMarkPaymentReceived.
  ///
  /// In en, this message translates to:
  /// **'Mark payment received'**
  String get projectMarkPaymentReceived;

  /// No description provided for @projectInvoices.
  ///
  /// In en, this message translates to:
  /// **'Invoices'**
  String get projectInvoices;

  /// No description provided for @projectGenerate.
  ///
  /// In en, this message translates to:
  /// **'Generate'**
  String get projectGenerate;

  /// No description provided for @projectNoInvoices.
  ///
  /// In en, this message translates to:
  /// **'No invoices yet'**
  String get projectNoInvoices;

  /// No description provided for @projectInvoiceCopied.
  ///
  /// In en, this message translates to:
  /// **'Invoice link copied to clipboard'**
  String get projectInvoiceCopied;

  /// No description provided for @projectMarkPaid.
  ///
  /// In en, this message translates to:
  /// **'Mark paid'**
  String get projectMarkPaid;

  /// No description provided for @projectGenerateInvoice.
  ///
  /// In en, this message translates to:
  /// **'Generate invoice'**
  String get projectGenerateInvoice;

  /// No description provided for @projectQty.
  ///
  /// In en, this message translates to:
  /// **'Qty'**
  String get projectQty;

  /// No description provided for @projectUnitPrice.
  ///
  /// In en, this message translates to:
  /// **'Unit price (UZS)'**
  String get projectUnitPrice;

  /// No description provided for @projectDueDateLabel.
  ///
  /// In en, this message translates to:
  /// **'Due date (YYYY-MM-DD)'**
  String get projectDueDateLabel;

  /// No description provided for @projectFormTitle.
  ///
  /// In en, this message translates to:
  /// **'New project'**
  String get projectFormTitle;

  /// No description provided for @projectSelectClient.
  ///
  /// In en, this message translates to:
  /// **'Select a client'**
  String get projectSelectClient;

  /// No description provided for @projectClientNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Client name'**
  String get projectClientNameLabel;

  /// No description provided for @projectClientNameHint.
  ///
  /// In en, this message translates to:
  /// **'Enter client name'**
  String get projectClientNameHint;

  /// No description provided for @projectNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Project name'**
  String get projectNameLabel;

  /// No description provided for @projectNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Brand identity redesign'**
  String get projectNameHint;

  /// No description provided for @projectScopeHint.
  ///
  /// In en, this message translates to:
  /// **'Describe deliverables...'**
  String get projectScopeHint;

  /// No description provided for @projectPriceLabel.
  ///
  /// In en, this message translates to:
  /// **'Total agreed price (UZS)'**
  String get projectPriceLabel;

  /// No description provided for @projectTermsHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. 50% upfront, 50% on delivery'**
  String get projectTermsHint;

  /// No description provided for @projectStartDate.
  ///
  /// In en, this message translates to:
  /// **'Start date'**
  String get projectStartDate;

  /// No description provided for @projectFormCreate.
  ///
  /// In en, this message translates to:
  /// **'Create project'**
  String get projectFormCreate;

  /// No description provided for @projectErrSelectClient.
  ///
  /// In en, this message translates to:
  /// **'Please select a client'**
  String get projectErrSelectClient;

  /// No description provided for @projectErrEnterClient.
  ///
  /// In en, this message translates to:
  /// **'Enter a client name'**
  String get projectErrEnterClient;

  /// No description provided for @projectErrNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Project name is required'**
  String get projectErrNameRequired;

  /// No description provided for @milestoneFormTitle.
  ///
  /// In en, this message translates to:
  /// **'Add milestone'**
  String get milestoneFormTitle;

  /// No description provided for @milestoneAdd.
  ///
  /// In en, this message translates to:
  /// **'Add milestone'**
  String get milestoneAdd;

  /// No description provided for @milestoneNameLabel.
  ///
  /// In en, this message translates to:
  /// **'Milestone name'**
  String get milestoneNameLabel;

  /// No description provided for @milestoneNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Initial design mockups'**
  String get milestoneNameHint;

  /// No description provided for @milestoneAmountLabel.
  ///
  /// In en, this message translates to:
  /// **'Amount (UZS)'**
  String get milestoneAmountLabel;

  /// No description provided for @milestoneDueDateLabel.
  ///
  /// In en, this message translates to:
  /// **'Due date'**
  String get milestoneDueDateLabel;

  /// No description provided for @milestoneAmountInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid amount'**
  String get milestoneAmountInvalid;

  /// No description provided for @analyticsTitle.
  ///
  /// In en, this message translates to:
  /// **'Analytics'**
  String get analyticsTitle;

  /// No description provided for @analyticsNoDataLastMonth.
  ///
  /// In en, this message translates to:
  /// **'No data last month'**
  String get analyticsNoDataLastMonth;

  /// No description provided for @analyticsVsLastMonth.
  ///
  /// In en, this message translates to:
  /// **'{change}% vs last month'**
  String analyticsVsLastMonth(String change);

  /// No description provided for @analyticsRevenueThisMonth.
  ///
  /// In en, this message translates to:
  /// **'Revenue this month'**
  String get analyticsRevenueThisMonth;

  /// No description provided for @analyticsLastMonth.
  ///
  /// In en, this message translates to:
  /// **'Last month: {amount}'**
  String analyticsLastMonth(String amount);

  /// No description provided for @analyticsCompletedThisMonth.
  ///
  /// In en, this message translates to:
  /// **'Completed\nthis month'**
  String get analyticsCompletedThisMonth;

  /// No description provided for @analyticsAvgOrderValue.
  ///
  /// In en, this message translates to:
  /// **'Avg order\nvalue'**
  String get analyticsAvgOrderValue;

  /// No description provided for @analyticsPendingPayments.
  ///
  /// In en, this message translates to:
  /// **'Pending payments'**
  String get analyticsPendingPayments;

  /// No description provided for @analyticsAllReceived.
  ///
  /// In en, this message translates to:
  /// **'All payments received'**
  String get analyticsAllReceived;

  /// No description provided for @analyticsTopCustomers.
  ///
  /// In en, this message translates to:
  /// **'TOP CUSTOMERS — LAST 90 DAYS'**
  String get analyticsTopCustomers;

  /// No description provided for @analyticsNoConfirmedOrders.
  ///
  /// In en, this message translates to:
  /// **'No confirmed orders in the last 90 days'**
  String get analyticsNoConfirmedOrders;

  /// No description provided for @analyticsBestSelling.
  ///
  /// In en, this message translates to:
  /// **'BEST SELLING PRODUCT'**
  String get analyticsBestSelling;

  /// No description provided for @analyticsUnitsSold.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 unit sold} other{{count} units sold}}'**
  String analyticsUnitsSold(int count);

  /// No description provided for @schedulingWorkingHours.
  ///
  /// In en, this message translates to:
  /// **'Working hours'**
  String get schedulingWorkingHours;

  /// No description provided for @schedulingWorkingHoursHint.
  ///
  /// In en, this message translates to:
  /// **'When customers can book. Times are Tashkent time, 24-hour.'**
  String get schedulingWorkingHoursHint;

  /// No description provided for @schedulingOpen.
  ///
  /// In en, this message translates to:
  /// **'Open'**
  String get schedulingOpen;

  /// No description provided for @schedulingClosed.
  ///
  /// In en, this message translates to:
  /// **'Closed'**
  String get schedulingClosed;

  /// No description provided for @schedulingDayMon.
  ///
  /// In en, this message translates to:
  /// **'Monday'**
  String get schedulingDayMon;

  /// No description provided for @schedulingDayTue.
  ///
  /// In en, this message translates to:
  /// **'Tuesday'**
  String get schedulingDayTue;

  /// No description provided for @schedulingDayWed.
  ///
  /// In en, this message translates to:
  /// **'Wednesday'**
  String get schedulingDayWed;

  /// No description provided for @schedulingDayThu.
  ///
  /// In en, this message translates to:
  /// **'Thursday'**
  String get schedulingDayThu;

  /// No description provided for @schedulingDayFri.
  ///
  /// In en, this message translates to:
  /// **'Friday'**
  String get schedulingDayFri;

  /// No description provided for @schedulingDaySat.
  ///
  /// In en, this message translates to:
  /// **'Saturday'**
  String get schedulingDaySat;

  /// No description provided for @schedulingDaySun.
  ///
  /// In en, this message translates to:
  /// **'Sunday'**
  String get schedulingDaySun;

  /// No description provided for @schedulingStart.
  ///
  /// In en, this message translates to:
  /// **'Start'**
  String get schedulingStart;

  /// No description provided for @schedulingEnd.
  ///
  /// In en, this message translates to:
  /// **'End'**
  String get schedulingEnd;

  /// No description provided for @schedulingTimeInvalid.
  ///
  /// In en, this message translates to:
  /// **'Start time must be before end time.'**
  String get schedulingTimeInvalid;

  /// No description provided for @schedulingBuffer.
  ///
  /// In en, this message translates to:
  /// **'Buffer between appointments'**
  String get schedulingBuffer;

  /// No description provided for @schedulingBufferHint.
  ///
  /// In en, this message translates to:
  /// **'Gap added after each appointment, e.g. for cleanup.'**
  String get schedulingBufferHint;

  /// No description provided for @schedulingBufferUnit.
  ///
  /// In en, this message translates to:
  /// **'minutes'**
  String get schedulingBufferUnit;

  /// No description provided for @schedulingWorkingHoursSaved.
  ///
  /// In en, this message translates to:
  /// **'Working hours saved'**
  String get schedulingWorkingHoursSaved;

  /// No description provided for @schedulingBlockedTime.
  ///
  /// In en, this message translates to:
  /// **'Blocked time'**
  String get schedulingBlockedTime;

  /// No description provided for @schedulingBlockedTimeHint.
  ///
  /// In en, this message translates to:
  /// **'Block off vacations, breaks or one-off closures so customers cannot book them.'**
  String get schedulingBlockedTimeHint;

  /// No description provided for @schedulingAddBlocked.
  ///
  /// In en, this message translates to:
  /// **'Add blocked time'**
  String get schedulingAddBlocked;

  /// No description provided for @schedulingNoBlocked.
  ///
  /// In en, this message translates to:
  /// **'No blocked time'**
  String get schedulingNoBlocked;

  /// No description provided for @schedulingScope.
  ///
  /// In en, this message translates to:
  /// **'Applies to'**
  String get schedulingScope;

  /// No description provided for @schedulingWholeBusiness.
  ///
  /// In en, this message translates to:
  /// **'Whole business'**
  String get schedulingWholeBusiness;

  /// No description provided for @schedulingDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get schedulingDate;

  /// No description provided for @schedulingReason.
  ///
  /// In en, this message translates to:
  /// **'Reason'**
  String get schedulingReason;

  /// No description provided for @schedulingReasonHint.
  ///
  /// In en, this message translates to:
  /// **'Optional, e.g. Public holiday'**
  String get schedulingReasonHint;

  /// No description provided for @schedulingAddBlockedSubmit.
  ///
  /// In en, this message translates to:
  /// **'Add block'**
  String get schedulingAddBlockedSubmit;

  /// No description provided for @schedulingDeleteBlockedTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete blocked time?'**
  String get schedulingDeleteBlockedTitle;

  /// No description provided for @schedulingDeleteBlockedConfirm.
  ///
  /// In en, this message translates to:
  /// **'This time will become bookable again.'**
  String get schedulingDeleteBlockedConfirm;

  /// No description provided for @staffFormDaysOffLabel.
  ///
  /// In en, this message translates to:
  /// **'Days off'**
  String get staffFormDaysOffLabel;

  /// No description provided for @staffFormDaysOffHint.
  ///
  /// In en, this message translates to:
  /// **'Specific dates this staff member is unavailable.'**
  String get staffFormDaysOffHint;

  /// No description provided for @staffFormAddDayOff.
  ///
  /// In en, this message translates to:
  /// **'Add day off'**
  String get staffFormAddDayOff;

  /// No description provided for @settingsModeSwitchTitle.
  ///
  /// In en, this message translates to:
  /// **'Switch business type?'**
  String get settingsModeSwitchTitle;

  /// No description provided for @settingsModeSwitchBody.
  ///
  /// In en, this message translates to:
  /// **'Switching from {from} to {to} will change your whole workspace. Your existing {data} will no longer be shown or managed, though they are not deleted. Your customers stay. This cannot be partially undone — you’d have to switch back to see them again. Are you sure?'**
  String settingsModeSwitchBody(String from, String to, String data);

  /// No description provided for @settingsModeSwitchConfirm.
  ///
  /// In en, this message translates to:
  /// **'Switch to {to}'**
  String settingsModeSwitchConfirm(String to);

  /// No description provided for @settingsModeNameServices.
  ///
  /// In en, this message translates to:
  /// **'Appointments'**
  String get settingsModeNameServices;

  /// No description provided for @settingsModeNameFreelance.
  ///
  /// In en, this message translates to:
  /// **'Projects'**
  String get settingsModeNameFreelance;

  /// No description provided for @settingsModeDataServices.
  ///
  /// In en, this message translates to:
  /// **'appointments'**
  String get settingsModeDataServices;

  /// No description provided for @settingsModeDataFreelance.
  ///
  /// In en, this message translates to:
  /// **'projects'**
  String get settingsModeDataFreelance;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'ru', 'uz'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'ru':
      return AppLocalizationsRu();
    case 'uz':
      return AppLocalizationsUz();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
