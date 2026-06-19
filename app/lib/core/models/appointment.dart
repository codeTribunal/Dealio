class AppointmentCustomer {
  final String id;
  final String name;
  final String? phone;
  final String? telegramUsername;

  const AppointmentCustomer({
    required this.id,
    required this.name,
    this.phone,
    this.telegramUsername,
  });

  factory AppointmentCustomer.fromJson(Map<String, dynamic> json) => AppointmentCustomer(
        id: json['id'] as String,
        name: json['name'] as String,
        phone: json['phone'] as String?,
        telegramUsername: json['telegramUsername'] as String?,
      );
}

class AppointmentService {
  final String id;
  final String name;
  final int durationMinutes;

  const AppointmentService({
    required this.id,
    required this.name,
    required this.durationMinutes,
  });

  factory AppointmentService.fromJson(Map<String, dynamic> json) => AppointmentService(
        id: json['id'] as String,
        name: json['name'] as String,
        durationMinutes: json['durationMinutes'] as int,
      );
}

class AppointmentStaff {
  final String id;
  final String name;

  const AppointmentStaff({required this.id, required this.name});

  factory AppointmentStaff.fromJson(Map<String, dynamic> json) => AppointmentStaff(
        id: json['id'] as String,
        name: json['name'] as String,
      );
}

class Appointment {
  final String id;
  final AppointmentCustomer customer;
  final AppointmentService service;
  final AppointmentStaff? staff;
  final DateTime startTime;
  final DateTime endTime;
  final int price;
  final String? notes;
  final String paymentType;
  final String paymentStatus;
  final String status;
  final bool reminderSent;
  final DateTime createdAt;
  final bool deleted;

  const Appointment({
    required this.id,
    required this.customer,
    required this.service,
    this.staff,
    required this.startTime,
    required this.endTime,
    required this.price,
    this.notes,
    required this.paymentType,
    required this.paymentStatus,
    required this.status,
    required this.reminderSent,
    required this.createdAt,
    this.deleted = false,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) => Appointment(
        id: json['id'] as String,
        customer: AppointmentCustomer.fromJson(
          json['customer'] as Map<String, dynamic>? ?? {'id': '', 'name': ''},
        ),
        service: AppointmentService.fromJson(
          json['service'] as Map<String, dynamic>? ?? {'id': '', 'name': '', 'durationMinutes': 0},
        ),
        staff: json['staff'] != null
            ? AppointmentStaff.fromJson(json['staff'] as Map<String, dynamic>)
            : null,
        startTime: DateTime.parse(json['startTime'] as String),
        endTime: DateTime.parse(json['endTime'] as String),
        price: json['price'] as int,
        notes: json['notes'] as String?,
        paymentType: json['paymentType'] as String? ?? 'AT_APPOINTMENT',
        paymentStatus: json['paymentStatus'] as String? ?? 'PENDING',
        status: json['status'] as String? ?? 'REQUESTED',
        reminderSent: json['reminderSent'] as bool? ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String),
        deleted: json['deleted'] as bool? ?? false,
      );

  bool get isActive => status == 'REQUESTED' || status == 'CONFIRMED';
  bool get isPaymentPending => paymentStatus == 'PENDING';
}
