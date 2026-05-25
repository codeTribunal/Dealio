class TopCustomer {
  final String id;
  final String name;
  final int totalSpent;
  final int orderCount;

  const TopCustomer({
    required this.id,
    required this.name,
    required this.totalSpent,
    required this.orderCount,
  });

  factory TopCustomer.fromJson(Map<String, dynamic> json) => TopCustomer(
        id: json['id'] as String,
        name: json['name'] as String,
        totalSpent: (json['totalSpent'] as num).toInt(),
        orderCount: (json['orderCount'] as num).toInt(),
      );
}

class BestSellingProduct {
  final String id;
  final String name;
  final int unitsSold;

  const BestSellingProduct({
    required this.id,
    required this.name,
    required this.unitsSold,
  });

  factory BestSellingProduct.fromJson(Map<String, dynamic> json) =>
      BestSellingProduct(
        id: json['id'] as String,
        name: json['name'] as String,
        unitsSold: (json['unitsSold'] as num).toInt(),
      );
}

class AnalyticsData {
  final int revenueThisMonth;
  final int revenueLastMonth;
  final int ordersCompletedThisMonth;
  final List<TopCustomer> topCustomers;
  final BestSellingProduct? bestSellingProduct;
  final int averageOrderValue;
  final int pendingPaymentsTotal;

  const AnalyticsData({
    required this.revenueThisMonth,
    required this.revenueLastMonth,
    required this.ordersCompletedThisMonth,
    required this.topCustomers,
    this.bestSellingProduct,
    required this.averageOrderValue,
    required this.pendingPaymentsTotal,
  });

  // Positive = growth, negative = decline, null = no last-month data
  double? get revenueChangePercent {
    if (revenueLastMonth == 0) return null;
    return ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;
  }

  factory AnalyticsData.fromJson(Map<String, dynamic> json) => AnalyticsData(
        revenueThisMonth: (json['revenueThisMonth'] as num).toInt(),
        revenueLastMonth: (json['revenueLastMonth'] as num).toInt(),
        ordersCompletedThisMonth: (json['ordersCompletedThisMonth'] as num).toInt(),
        topCustomers: (json['topCustomers'] as List)
            .map((e) => TopCustomer.fromJson(e as Map<String, dynamic>))
            .toList(),
        bestSellingProduct: json['bestSellingProduct'] != null
            ? BestSellingProduct.fromJson(
                json['bestSellingProduct'] as Map<String, dynamic>)
            : null,
        averageOrderValue: (json['averageOrderValue'] as num).toInt(),
        pendingPaymentsTotal: (json['pendingPaymentsTotal'] as num).toInt(),
      );
}
