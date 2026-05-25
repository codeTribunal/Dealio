class Business {
  final String id;
  final String name;
  final String? description;
  final String? photoUrl;
  final List<String> mode;
  final String language;
  final String? cardNumber;
  final String? cardBank;
  final String? botToken;
  final String? botUsername;
  final String? ownerTelegramChatId;

  const Business({
    required this.id,
    required this.name,
    this.description,
    this.photoUrl,
    required this.mode,
    required this.language,
    this.cardNumber,
    this.cardBank,
    this.botToken,
    this.botUsername,
    this.ownerTelegramChatId,
  });

  factory Business.fromJson(Map<String, dynamic> json) => Business(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        photoUrl: json['photoUrl'] as String?,
        mode: List<String>.from(json['mode'] as List? ?? []),
        language: json['language'] as String? ?? 'UZBEK',
        cardNumber: json['cardNumber'] as String?,
        cardBank: json['cardBank'] as String?,
        botToken: json['botToken'] as String?,
        botUsername: json['botUsername'] as String?,
        ownerTelegramChatId: json['ownerTelegramChatId'] as String?,
      );

  Business copyWith({
    String? name,
    String? description,
    String? photoUrl,
    List<String>? mode,
    String? language,
    String? cardNumber,
    String? cardBank,
    String? botUsername,
  }) =>
      Business(
        id: id,
        name: name ?? this.name,
        description: description ?? this.description,
        photoUrl: photoUrl ?? this.photoUrl,
        mode: mode ?? this.mode,
        language: language ?? this.language,
        cardNumber: cardNumber ?? this.cardNumber,
        cardBank: cardBank ?? this.cardBank,
        botToken: botToken,
        botUsername: botUsername ?? this.botUsername,
        ownerTelegramChatId: ownerTelegramChatId,
      );
}
