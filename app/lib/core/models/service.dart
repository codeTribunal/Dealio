class ServiceStaffRef {
  final String id;
  final String name;

  const ServiceStaffRef({required this.id, required this.name});

  factory ServiceStaffRef.fromJson(Map<String, dynamic> json) => ServiceStaffRef(
        id: json['id'] as String,
        name: json['name'] as String,
      );
}

class Service {
  final String id;
  final String name;
  final int durationMinutes;
  final int price;
  final bool active;
  final List<ServiceStaffRef> staff;
  final DateTime createdAt;

  const Service({
    required this.id,
    required this.name,
    required this.durationMinutes,
    required this.price,
    required this.active,
    required this.staff,
    required this.createdAt,
  });

  factory Service.fromJson(Map<String, dynamic> json) {
    final staffServices = (json['staffServices'] as List? ?? []);
    final staffList = staffServices
        .map((ss) => ServiceStaffRef.fromJson((ss as Map<String, dynamic>)['staff'] as Map<String, dynamic>))
        .toList();

    return Service(
      id: json['id'] as String,
      name: json['name'] as String,
      durationMinutes: json['durationMinutes'] as int,
      price: json['price'] as int,
      active: json['active'] as bool? ?? true,
      staff: staffList,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  String get durationLabel {
    if (durationMinutes < 60) return '$durationMinutes min';
    final hours = durationMinutes ~/ 60;
    final mins = durationMinutes % 60;
    return mins == 0 ? '${hours}h' : '${hours}h ${mins}min';
  }
}
