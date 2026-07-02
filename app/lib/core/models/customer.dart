import 'order.dart';

class CustomerStage {
  final String id;
  final String name;
  final String color;

  const CustomerStage({required this.id, required this.name, required this.color});

  factory CustomerStage.fromJson(Map<String, dynamic> json) => CustomerStage(
        id: json['id'] as String,
        name: json['name'] as String,
        color: json['color'] as String? ?? '#6366F1',
      );
}

class BusinessCustomField {
  final String id;
  final String name;
  final String fieldType;
  final int order;

  const BusinessCustomField({
    required this.id,
    required this.name,
    required this.fieldType,
    required this.order,
  });

  factory BusinessCustomField.fromJson(Map<String, dynamic> json) =>
      BusinessCustomField(
        id: json['id'] as String,
        name: json['name'] as String,
        fieldType: json['fieldType'] as String? ?? 'TEXT',
        order: json['order'] as int? ?? 0,
      );
}

class CustomerFieldValue {
  final String id;
  final String fieldId;
  final String value;
  final BusinessCustomField field;

  const CustomerFieldValue({
    required this.id,
    required this.fieldId,
    required this.value,
    required this.field,
  });

  factory CustomerFieldValue.fromJson(Map<String, dynamic> json) =>
      CustomerFieldValue(
        id: json['id'] as String,
        fieldId: json['fieldId'] as String,
        value: json['value'] as String,
        field: BusinessCustomField.fromJson(json['field'] as Map<String, dynamic>),
      );
}

class CheckoutQuestion {
  final String id;
  final String question;
  final bool required;
  final int order;

  const CheckoutQuestion({
    required this.id,
    required this.question,
    required this.required,
    required this.order,
  });

  factory CheckoutQuestion.fromJson(Map<String, dynamic> json) =>
      CheckoutQuestion(
        id: json['id'] as String,
        question: json['question'] as String,
        required: json['required'] as bool? ?? false,
        order: json['order'] as int? ?? 0,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'question': question,
        'required': required,
        'order': order,
      };
}

class CustomerTag {
  final String id;
  final String label;
  final String color;

  const CustomerTag({required this.id, required this.label, required this.color});

  factory CustomerTag.fromJson(Map<String, dynamic> json) => CustomerTag(
        id: json['id'] as String,
        label: json['label'] as String,
        color: json['color'] as String? ?? '#6366F1',
      );
}

class Reminder {
  final String id;
  final String note;
  final DateTime dueDate;
  final bool done;
  final DateTime createdAt;

  const Reminder({
    required this.id,
    required this.note,
    required this.dueDate,
    required this.done,
    required this.createdAt,
  });

  bool get isOverdue => !done && dueDate.isBefore(DateTime.now());
  bool get isDueToday {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final due = DateTime(dueDate.year, dueDate.month, dueDate.day);
    return due == today;
  }

  Reminder copyWith({bool? done}) => Reminder(
        id: id,
        note: note,
        dueDate: dueDate,
        done: done ?? this.done,
        createdAt: createdAt,
      );

  factory Reminder.fromJson(Map<String, dynamic> json) => Reminder(
        id: json['id'] as String,
        note: json['note'] as String,
        dueDate: DateTime.parse(json['dueDate'] as String),
        done: json['done'] as bool? ?? false,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

// ── List model ────────────────────────────────────────────────────────

class Customer {
  final String id;
  final String name;
  final String? phone;
  final String? telegramUsername;
  final String? notes;
  final DateTime? birthday;
  final int orderCount;
  final List<CustomerTag> tags;
  final CustomerStage? currentStage;
  final DateTime lastInteractionAt;
  final DateTime createdAt;
  final bool deleted;

  const Customer({
    required this.id,
    required this.name,
    this.phone,
    this.telegramUsername,
    this.notes,
    this.birthday,
    required this.orderCount,
    required this.tags,
    this.currentStage,
    required this.lastInteractionAt,
    required this.createdAt,
    this.deleted = false,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    final count =
        (json['_count'] as Map<String, dynamic>?)?['orders'] as int? ?? 0;
    return Customer(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String?,
      telegramUsername: json['telegramUsername'] as String?,
      notes: json['notes'] as String?,
      birthday: json['birthday'] != null
          ? DateTime.parse(json['birthday'] as String)
          : null,
      orderCount: count,
      tags: (json['tags'] as List? ?? [])
          .map((e) => CustomerTag.fromJson(e as Map<String, dynamic>))
          .toList(),
      currentStage: json['currentStage'] != null
          ? CustomerStage.fromJson(json['currentStage'] as Map<String, dynamic>)
          : null,
      lastInteractionAt:
          DateTime.parse(json['lastInteractionAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      deleted: json['deleted'] as bool? ?? false,
    );
  }
}

// ── Detail model ──────────────────────────────────────────────────────

/// A customer's past appointment — history row on Customer Detail.
class CustomerAppointment {
  final String id;
  final String serviceName;
  final DateTime startTime;
  final String status;
  final int price;

  const CustomerAppointment({
    required this.id,
    required this.serviceName,
    required this.startTime,
    required this.status,
    required this.price,
  });

  factory CustomerAppointment.fromJson(Map<String, dynamic> json) =>
      CustomerAppointment(
        id: json['id'] as String,
        serviceName:
            (json['service'] as Map<String, dynamic>?)?['name'] as String? ??
                '',
        startTime: DateTime.parse(json['startTime'] as String),
        status: json['status'] as String,
        price: (json['price'] as num).toInt(),
      );
}

/// A customer's project — history row on Customer Detail.
class CustomerProject {
  final String id;
  final String name;
  final int totalPrice;
  final String status;
  final DateTime createdAt;

  const CustomerProject({
    required this.id,
    required this.name,
    required this.totalPrice,
    required this.status,
    required this.createdAt,
  });

  factory CustomerProject.fromJson(Map<String, dynamic> json) =>
      CustomerProject(
        id: json['id'] as String,
        name: json['name'] as String,
        totalPrice: (json['totalPrice'] as num).toInt(),
        status: json['status'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

class CustomerDetail {
  final String id;
  final String name;
  final String? phone;
  final String? telegramUsername;
  final String? telegramUserId;
  final String? notes;
  final DateTime? birthday;
  final Map<String, String> customFields;
  final List<CustomerFieldValue> fieldValues;
  final CustomerStage? currentStage;
  final List<CustomerTag> tags;
  final List<Reminder> reminders;
  final List<Order> orders;
  final List<CustomerAppointment> appointments;
  final List<CustomerProject> projects;
  final DateTime lastInteractionAt;
  final DateTime createdAt;

  const CustomerDetail({
    required this.id,
    required this.name,
    this.phone,
    this.telegramUsername,
    this.telegramUserId,
    this.notes,
    this.birthday,
    required this.customFields,
    this.fieldValues = const [],
    this.currentStage,
    required this.tags,
    required this.reminders,
    required this.orders,
    this.appointments = const [],
    this.projects = const [],
    required this.lastInteractionAt,
    required this.createdAt,
  });

  int get totalOrders => orders.length;
  int get totalSpent => orders
      .where((o) => o.paymentStatus == 'CONFIRMED')
      .fold(0, (sum, o) => sum + o.total);
  int get daysSinceLastOrder {
    if (orders.isEmpty) return -1;
    return DateTime.now().difference(orders.first.createdAt).inDays;
  }
  DateTime? get lastOrderDate => orders.isEmpty ? null : orders.first.createdAt;

  bool get hasTelegram => telegramUserId != null && telegramUserId!.isNotEmpty;

  CustomerDetail copyWith({
    String? notes,
    List<CustomerTag>? tags,
    List<Reminder>? reminders,
    Map<String, String>? customFields,
    List<CustomerFieldValue>? fieldValues,
    CustomerStage? currentStage,
    bool clearStage = false,
  }) =>
      CustomerDetail(
        id: id,
        name: name,
        phone: phone,
        telegramUsername: telegramUsername,
        telegramUserId: telegramUserId,
        notes: notes ?? this.notes,
        birthday: birthday,
        customFields: customFields ?? this.customFields,
        fieldValues: fieldValues ?? this.fieldValues,
        currentStage: clearStage ? null : (currentStage ?? this.currentStage),
        tags: tags ?? this.tags,
        reminders: reminders ?? this.reminders,
        orders: orders,
        appointments: appointments,
        projects: projects,
        lastInteractionAt: lastInteractionAt,
        createdAt: createdAt,
      );

  factory CustomerDetail.fromJson(Map<String, dynamic> json) {
    final rawFields = json['customFields'];
    final Map<String, String> fields;
    if (rawFields is Map) {
      fields = rawFields.map((k, v) => MapEntry(k.toString(), v.toString()));
    } else {
      fields = {};
    }

    return CustomerDetail(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String?,
      telegramUsername: json['telegramUsername'] as String?,
      telegramUserId: json['telegramUserId'] as String?,
      notes: json['notes'] as String?,
      birthday: json['birthday'] != null
          ? DateTime.parse(json['birthday'] as String)
          : null,
      customFields: fields,
      fieldValues: (json['fieldValues'] as List? ?? [])
          .map((e) => CustomerFieldValue.fromJson(e as Map<String, dynamic>))
          .toList(),
      currentStage: json['currentStage'] != null
          ? CustomerStage.fromJson(json['currentStage'] as Map<String, dynamic>)
          : null,
      tags: (json['tags'] as List? ?? [])
          .map((e) => CustomerTag.fromJson(e as Map<String, dynamic>))
          .toList(),
      reminders: (json['reminders'] as List? ?? [])
          .map((e) => Reminder.fromJson(e as Map<String, dynamic>))
          .toList(),
      orders: (json['orders'] as List? ?? [])
          .map((e) => Order.fromJson(e as Map<String, dynamic>))
          .toList(),
      appointments: (json['appointments'] as List? ?? [])
          .map((e) => CustomerAppointment.fromJson(e as Map<String, dynamic>))
          .toList(),
      projects: (json['projects'] as List? ?? [])
          .map((e) => CustomerProject.fromJson(e as Map<String, dynamic>))
          .toList(),
      lastInteractionAt:
          DateTime.parse(json['lastInteractionAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

// ── Home screen models ─────────────────────────────────────────────────

class ReminderItem {
  final String id;
  final String note;
  final DateTime dueDate;
  final String customerId;
  final String customerName;
  final String? customerTelegramUsername;

  const ReminderItem({
    required this.id,
    required this.note,
    required this.dueDate,
    required this.customerId,
    required this.customerName,
    this.customerTelegramUsername,
  });

  bool get isOverdue {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return dueDate.isBefore(today);
  }

  factory ReminderItem.fromJson(Map<String, dynamic> json) {
    final customer = json['customer'] as Map<String, dynamic>;
    return ReminderItem(
      id: json['id'] as String,
      note: json['note'] as String,
      dueDate: DateTime.parse(json['dueDate'] as String),
      customerId: customer['id'] as String,
      customerName: customer['name'] as String,
      customerTelegramUsername: customer['telegramUsername'] as String?,
    );
  }
}

class DormantCustomer {
  final String id;
  final String name;
  final String? telegramUsername;
  final int daysSince;
  final int orderCount;

  const DormantCustomer({
    required this.id,
    required this.name,
    this.telegramUsername,
    required this.daysSince,
    required this.orderCount,
  });

  factory DormantCustomer.fromJson(Map<String, dynamic> json) => DormantCustomer(
        id: json['id'] as String,
        name: json['name'] as String,
        telegramUsername: json['telegramUsername'] as String?,
        daysSince: (json['daysSince'] as num).toInt(),
        orderCount: (json['orderCount'] as num).toInt(),
      );
}

class PendingPayment {
  final String id;
  final int orderNumber;
  final int total;
  final String customerId;
  final String customerName;
  final DateTime updatedAt;

  const PendingPayment({
    required this.id,
    required this.orderNumber,
    required this.total,
    required this.customerId,
    required this.customerName,
    required this.updatedAt,
  });

  factory PendingPayment.fromJson(Map<String, dynamic> json) {
    final customer = json['customer'] as Map<String, dynamic>;
    return PendingPayment(
      id: json['id'] as String,
      orderNumber: (json['orderNumber'] as num).toInt(),
      total: (json['total'] as num).toInt(),
      customerId: customer['id'] as String,
      customerName: customer['name'] as String,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

/// In-advance appointment awaiting payment confirmation — merged with
/// [PendingPayment] into the home payment queue.
class PendingApptPayment {
  final String id;
  final String serviceName;
  final int price;
  final String customerId;
  final String customerName;
  final DateTime updatedAt;

  const PendingApptPayment({
    required this.id,
    required this.serviceName,
    required this.price,
    required this.customerId,
    required this.customerName,
    required this.updatedAt,
  });

  factory PendingApptPayment.fromJson(Map<String, dynamic> json) {
    final customer = json['customer'] as Map<String, dynamic>;
    return PendingApptPayment(
      id: json['id'] as String,
      serviceName: json['serviceName'] as String,
      price: (json['price'] as num).toInt(),
      customerId: customer['id'] as String,
      customerName: customer['name'] as String,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class SimpleCustomer {
  final String id;
  final String name;
  final String? telegramUsername;
  final DateTime createdAt;

  const SimpleCustomer({
    required this.id,
    required this.name,
    this.telegramUsername,
    required this.createdAt,
  });

  factory SimpleCustomer.fromJson(Map<String, dynamic> json) => SimpleCustomer(
        id: json['id'] as String,
        name: json['name'] as String,
        telegramUsername: json['telegramUsername'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

class HomeAppointment {
  final String id;
  final String customerName;
  final String serviceName;
  final DateTime startTime;
  final String status;

  const HomeAppointment({
    required this.id,
    required this.customerName,
    required this.serviceName,
    required this.startTime,
    required this.status,
  });

  factory HomeAppointment.fromJson(Map<String, dynamic> json) =>
      HomeAppointment(
        id: json['id'] as String,
        customerName: json['customerName'] as String,
        serviceName: json['serviceName'] as String,
        startTime: DateTime.parse(json['startTime'] as String),
        status: json['status'] as String,
      );
}

class HomeProject {
  final String id;
  final String name;
  final String customerName;
  final DateTime createdAt;

  const HomeProject({
    required this.id,
    required this.name,
    required this.customerName,
    required this.createdAt,
  });

  factory HomeProject.fromJson(Map<String, dynamic> json) => HomeProject(
        id: json['id'] as String,
        name: json['name'] as String,
        customerName: json['customerName'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

class HomeMilestone {
  final String id;
  final String milestoneName;
  final String projectName;
  final String customerName;
  final DateTime updatedAt;
  final String projectId;

  const HomeMilestone({
    required this.id,
    required this.milestoneName,
    required this.projectName,
    required this.customerName,
    required this.updatedAt,
    required this.projectId,
  });

  factory HomeMilestone.fromJson(Map<String, dynamic> json) => HomeMilestone(
        id: json['id'] as String,
        milestoneName: json['milestoneName'] as String,
        projectName: json['projectName'] as String,
        customerName: json['customerName'] as String,
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        projectId: json['projectId'] as String,
      );
}

// ── Search result model ───────────────────────────────────────────────

class CustomerSearchResult {
  final String id;
  final String name;
  final String? telegramUsername;
  final String? phone;
  final int orderCount;

  const CustomerSearchResult({
    required this.id,
    required this.name,
    this.telegramUsername,
    this.phone,
    required this.orderCount,
  });

  factory CustomerSearchResult.fromJson(Map<String, dynamic> json) {
    return CustomerSearchResult(
      id: json['id'] as String,
      name: json['name'] as String,
      telegramUsername: json['telegramUsername'] as String?,
      phone: json['phone'] as String?,
      orderCount:
          (json['_count'] as Map<String, dynamic>?)?['orders'] as int? ?? 0,
    );
  }
}

class HomeData {
  final String businessName;
  final List<ReminderItem> overdueReminders;
  final List<DormantCustomer> dormantCustomers;
  final List<Order> todayOrders;
  final List<PendingPayment> pendingPayments;
  final List<PendingApptPayment> pendingAppointmentPayments;
  final List<SimpleCustomer> newCustomers;
  final List<HomeAppointment> todayAppointments;
  final List<HomeAppointment> recentCancellations;
  final List<HomeProject> todayProjects;
  final List<HomeMilestone> recentMilestones;

  const HomeData({
    required this.businessName,
    required this.overdueReminders,
    required this.dormantCustomers,
    required this.todayOrders,
    required this.pendingPayments,
    required this.pendingAppointmentPayments,
    required this.newCustomers,
    required this.todayAppointments,
    required this.recentCancellations,
    required this.todayProjects,
    required this.recentMilestones,
  });

  bool get hasAttentionItems =>
      overdueReminders.isNotEmpty || dormantCustomers.isNotEmpty;

  bool get hasTodayActivity =>
      todayOrders.isNotEmpty ||
      pendingPayments.isNotEmpty ||
      newCustomers.isNotEmpty ||
      todayAppointments.isNotEmpty ||
      recentCancellations.isNotEmpty ||
      todayProjects.isNotEmpty ||
      recentMilestones.isNotEmpty;
}
