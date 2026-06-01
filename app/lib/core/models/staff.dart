class StaffServiceRef {
  final String id;
  final String name;
  final int durationMinutes;
  final int price;

  const StaffServiceRef({
    required this.id,
    required this.name,
    required this.durationMinutes,
    required this.price,
  });

  factory StaffServiceRef.fromJson(Map<String, dynamic> json) => StaffServiceRef(
        id: json['id'] as String,
        name: json['name'] as String,
        durationMinutes: json['durationMinutes'] as int,
        price: json['price'] as int,
      );
}

class Staff {
  final String id;
  final String name;
  final String? telegramHandle;
  final List<StaffServiceRef> services;
  // Whole-day offs, as ISO date strings (e.g. "2026-06-15T00:00:00.000Z").
  final List<String> daysOff;
  final DateTime createdAt;

  const Staff({
    required this.id,
    required this.name,
    this.telegramHandle,
    required this.services,
    this.daysOff = const [],
    required this.createdAt,
  });

  factory Staff.fromJson(Map<String, dynamic> json) {
    final staffServices = (json['staffServices'] as List? ?? []);
    final servicesList = staffServices
        .map((ss) => StaffServiceRef.fromJson((ss as Map<String, dynamic>)['service'] as Map<String, dynamic>))
        .toList();

    return Staff(
      id: json['id'] as String,
      name: json['name'] as String,
      telegramHandle: json['telegramHandle'] as String?,
      services: servicesList,
      daysOff: (json['daysOff'] as List? ?? [])
          .map((e) => e.toString())
          .toList(),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
