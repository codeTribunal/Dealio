class Business {
  final String id;
  final String name;
  final String? description;
  // Physical location shown to customers: pickup point (PRODUCTS) and
  // appointment location (SERVICES). One field, both uses. Optional.
  final String? address;
  final String? photoUrl;
  // Single business mode (was List<String> — migrated to a scalar in Step 2).
  // Values: 'SERVICES' | 'FREELANCE' ('PRODUCTS' dormant, no longer assigned).
  final String mode;
  final String language;
  final String? plan;
  final String? botToken;
  final String? botUsername;
  final String? calendarToken;
  final String? ownerTelegramChatId;
  // Working hours: keys "0".."6" (0=Sunday … 6=Saturday, Tashkent local), each
  // value { start: "HH:MM", end: "HH:MM" } or null = closed that day.
  final Map<String, dynamic>? workingHours;
  final int bufferMinutes;
  // Payment — P2P card transfer. Edited in Settings via PATCH /business/payment
  // and shown to customers in the Telegram bot. Visibility is gated by
  // [cardPaymentsEnabled] below (global flag).
  final String? cardNumber;
  final String? cardHolderName;
  // Global, superadmin-controlled flag (default ON) carried on GET /business.
  // When false, card-payment SETUP UI (onboarding/Settings) should be hidden.
  // Visibility only — no payment data is affected.
  final bool cardPaymentsEnabled;
  // Owner email + newsletter/marketing consent — flattened onto GET /business
  // (email → ownerEmail). Drives the analytics email-capture card + the Settings
  // email field. These live on the User (owner) server-side.
  final String? ownerEmail;
  final bool newsletterConsent;
  final DateTime? newsletterConsentAt;
  final DateTime? emailPromptDismissedAt;
  final int emailPromptDismissCount;

  const Business({
    required this.id,
    required this.name,
    this.description,
    this.address,
    this.photoUrl,
    required this.mode,
    required this.language,
    this.plan,
    this.botToken,
    this.botUsername,
    this.calendarToken,
    this.ownerTelegramChatId,
    this.workingHours,
    this.bufferMinutes = 0,
    this.cardNumber,
    this.cardHolderName,
    this.cardPaymentsEnabled = true,
    this.ownerEmail,
    this.newsletterConsent = false,
    this.newsletterConsentAt,
    this.emailPromptDismissedAt,
    this.emailPromptDismissCount = 0,
  });

  factory Business.fromJson(Map<String, dynamic> json) => Business(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        address: json['address'] as String?,
        photoUrl: json['photoUrl'] as String?,
        mode: json['mode'] as String? ?? 'SERVICES',
        language: json['language'] as String? ?? 'UZBEK',
        plan: json['plan'] as String?,
        botToken: json['botToken'] as String?,
        botUsername: json['botUsername'] as String?,
        calendarToken: json['calendarToken'] as String?,
        ownerTelegramChatId: json['ownerTelegramChatId'] as String?,
        workingHours: json['workingHours'] != null
            ? Map<String, dynamic>.from(json['workingHours'] as Map)
            : null,
        bufferMinutes: json['bufferMinutes'] as int? ?? 0,
        cardNumber: json['cardNumber'] as String?,
        cardHolderName: json['cardHolderName'] as String?,
        cardPaymentsEnabled: json['cardPaymentsEnabled'] as bool? ?? true,
        ownerEmail: json['ownerEmail'] as String?,
        newsletterConsent: json['newsletterConsent'] as bool? ?? false,
        newsletterConsentAt: json['newsletterConsentAt'] != null
            ? DateTime.tryParse(json['newsletterConsentAt'] as String)
            : null,
        emailPromptDismissedAt: json['emailPromptDismissedAt'] != null
            ? DateTime.tryParse(json['emailPromptDismissedAt'] as String)
            : null,
        emailPromptDismissCount: json['emailPromptDismissCount'] as int? ?? 0,
      );

  /// Whether the analytics email-capture card should show — identical logic on
  /// app + web. Show only if no email yet AND (never dismissed, OR dismissed
  /// exactly once more than 30 days ago). After the 2nd dismissal: never again.
  bool get shouldPromptEmail {
    if (ownerEmail != null && ownerEmail!.isNotEmpty) return false;
    if (emailPromptDismissCount == 0) return true;
    if (emailPromptDismissCount == 1 && emailPromptDismissedAt != null) {
      return DateTime.now().difference(emailPromptDismissedAt!).inDays > 30;
    }
    return false;
  }

  Business copyWith({
    String? name,
    String? description,
    String? address,
    String? photoUrl,
    String? mode,
    String? language,
    String? botUsername,
    String? calendarToken,
    bool clearCalendarToken = false,
    Map<String, dynamic>? workingHours,
    int? bufferMinutes,
  }) =>
      Business(
        id: id,
        name: name ?? this.name,
        description: description ?? this.description,
        address: address ?? this.address,
        photoUrl: photoUrl ?? this.photoUrl,
        mode: mode ?? this.mode,
        language: language ?? this.language,
        plan: plan,
        botToken: botToken,
        botUsername: botUsername ?? this.botUsername,
        calendarToken:
            clearCalendarToken ? null : (calendarToken ?? this.calendarToken),
        ownerTelegramChatId: ownerTelegramChatId,
        workingHours: workingHours ?? this.workingHours,
        bufferMinutes: bufferMinutes ?? this.bufferMinutes,
        cardNumber: cardNumber,
        cardHolderName: cardHolderName,
        cardPaymentsEnabled: cardPaymentsEnabled,
        ownerEmail: ownerEmail,
        newsletterConsent: newsletterConsent,
        newsletterConsentAt: newsletterConsentAt,
        emailPromptDismissedAt: emailPromptDismissedAt,
        emailPromptDismissCount: emailPromptDismissCount,
      );
}
