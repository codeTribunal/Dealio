class Project {
  final String id;
  final String businessId;
  final String customerId;
  final ProjectCustomer customer;
  final String name;
  final String? description;
  final String? paymentTerms;
  final int totalPrice;
  final DateTime? startDate;
  final DateTime? deadline;
  final String status;
  final List<Milestone> milestones;
  final List<Invoice> invoices;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Project({
    required this.id,
    required this.businessId,
    required this.customerId,
    required this.customer,
    required this.name,
    this.description,
    this.paymentTerms,
    required this.totalPrice,
    this.startDate,
    this.deadline,
    required this.status,
    required this.milestones,
    required this.invoices,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Project.fromJson(Map<String, dynamic> json) => Project(
        id: json['id'] as String,
        businessId: json['businessId'] as String,
        customerId: json['customerId'] as String,
        customer: ProjectCustomer.fromJson(json['customer'] as Map<String, dynamic>),
        name: json['name'] as String,
        description: json['description'] as String?,
        paymentTerms: json['paymentTerms'] as String?,
        totalPrice: json['totalPrice'] as int,
        startDate: json['startDate'] != null ? DateTime.parse(json['startDate'] as String) : null,
        deadline: json['deadline'] != null ? DateTime.parse(json['deadline'] as String) : null,
        status: json['status'] as String,
        milestones: (json['milestones'] as List)
            .map((e) => Milestone.fromJson(e as Map<String, dynamic>))
            .toList(),
        invoices: (json['invoices'] as List)
            .map((e) => Invoice.fromJson(e as Map<String, dynamic>))
            .toList(),
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
      );
}

class ProjectCustomer {
  final String id;
  final String name;
  final String? phone;
  final String? telegramUsername;

  const ProjectCustomer({
    required this.id,
    required this.name,
    this.phone,
    this.telegramUsername,
  });

  factory ProjectCustomer.fromJson(Map<String, dynamic> json) => ProjectCustomer(
        id: json['id'] as String,
        name: json['name'] as String,
        phone: json['phone'] as String?,
        telegramUsername: json['telegramUsername'] as String?,
      );
}

class Milestone {
  final String id;
  final String projectId;
  final String name;
  final DateTime? dueDate;
  final int amount;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Milestone({
    required this.id,
    required this.projectId,
    required this.name,
    this.dueDate,
    required this.amount,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Milestone.fromJson(Map<String, dynamic> json) => Milestone(
        id: json['id'] as String,
        projectId: json['projectId'] as String? ?? '',
        name: json['name'] as String,
        dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate'] as String) : null,
        amount: json['amount'] as int,
        status: json['status'] as String,
        createdAt: json['createdAt'] != null
            ? DateTime.parse(json['createdAt'] as String)
            : DateTime.now(),
        updatedAt: json['updatedAt'] != null
            ? DateTime.parse(json['updatedAt'] as String)
            : DateTime.now(),
      );
}

class Invoice {
  final String id;
  final String projectId;
  final String invoiceNumber;
  final List<Map<String, dynamic>> lineItems;
  final int total;
  final DateTime? dueDate;
  final String status;
  final DateTime createdAt;

  const Invoice({
    required this.id,
    required this.projectId,
    required this.invoiceNumber,
    required this.lineItems,
    required this.total,
    this.dueDate,
    required this.status,
    required this.createdAt,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) => Invoice(
        id: json['id'] as String,
        projectId: json['projectId'] as String? ?? '',
        invoiceNumber: json['invoiceNumber'] as String,
        lineItems: json['lineItems'] != null
            ? (json['lineItems'] as List).cast<Map<String, dynamic>>()
            : [],
        total: json['total'] as int,
        dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate'] as String) : null,
        status: json['status'] as String,
        createdAt: json['createdAt'] != null
            ? DateTime.parse(json['createdAt'] as String)
            : DateTime.now(),
      );
}
