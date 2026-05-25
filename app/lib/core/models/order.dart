class OrderItem {
  final String id;
  final String productId;
  final String productName;
  final int quantity;
  final int price;

  const OrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.price,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    final product = json['product'] as Map<String, dynamic>? ?? {};
    return OrderItem(
      id: json['id'] as String,
      productId: json['productId'] as String,
      productName: product['name'] as String? ?? '',
      quantity: json['quantity'] as int,
      price: json['price'] as int,
    );
  }

  int get subtotal => price * quantity;
}

class OrderCustomer {
  final String id;
  final String name;
  final String? phone;

  const OrderCustomer({required this.id, required this.name, this.phone});

  factory OrderCustomer.fromJson(Map<String, dynamic> json) => OrderCustomer(
        id: json['id'] as String,
        name: json['name'] as String,
        phone: json['phone'] as String?,
      );
}

class Order {
  final String id;
  final int orderNumber;
  final OrderCustomer customer;
  final List<OrderItem> items;
  final int total;
  final String deliveryMethod;
  final String? deliveryAddress;
  final String orderStatus;
  final String paymentStatus;
  final List<dynamic> timeline;
  final String? notes;
  final Map<String, String> customAnswers;
  final DateTime createdAt;

  const Order({
    required this.id,
    required this.orderNumber,
    required this.customer,
    required this.items,
    required this.total,
    required this.deliveryMethod,
    this.deliveryAddress,
    required this.orderStatus,
    required this.paymentStatus,
    required this.timeline,
    this.notes,
    this.customAnswers = const {},
    required this.createdAt,
  });

  factory Order.fromJson(Map<String, dynamic> json) {
    final rawAnswers = json['customAnswers'];
    final Map<String, String> answers;
    if (rawAnswers is Map) {
      answers = rawAnswers.map((k, v) => MapEntry(k.toString(), v.toString()));
    } else {
      answers = {};
    }

    return Order(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as int,
      customer: OrderCustomer.fromJson(
        json['customer'] as Map<String, dynamic>? ?? {'id': '', 'name': ''},
      ),
      items: (json['items'] as List? ?? [])
          .map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      total: json['total'] as int,
      deliveryMethod: json['deliveryMethod'] as String,
      deliveryAddress: json['deliveryAddress'] as String?,
      orderStatus: json['orderStatus'] as String,
      paymentStatus: json['paymentStatus'] as String,
      timeline: json['timeline'] as List? ?? [],
      notes: json['notes'] as String?,
      customAnswers: answers,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  bool get isPending =>
      orderStatus == 'NEW' || orderStatus == 'PREPARING';

  bool get isPaymentPending => paymentStatus == 'PENDING';
}
