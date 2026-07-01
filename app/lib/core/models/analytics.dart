class TopCustomer {
  final String id;
  final String name;
  final int totalSpent;
  final int appointmentCount;

  const TopCustomer({
    required this.id,
    required this.name,
    required this.totalSpent,
    required this.appointmentCount,
  });

  factory TopCustomer.fromJson(Map<String, dynamic> json) => TopCustomer(
        id: json['id'] as String,
        name: json['name'] as String,
        totalSpent: (json['totalSpent'] as num).toInt(),
        appointmentCount: (json['appointmentCount'] as num?)?.toInt() ?? 0,
      );
}

class AnalyticsData {
  final int revenueThisMonth;
  final int revenueLastMonth;
  final int completedThisMonth;
  final int appointmentsThisMonth;
  final int pendingPaymentsTotal;
  final List<TopCustomer> topCustomers;
  // Realised revenue for the last 6 calendar months (oldest → current); the
  // final entry is the current month. Empty on older backends.
  final List<int> revenueTrend;

  const AnalyticsData({
    required this.revenueThisMonth,
    required this.revenueLastMonth,
    required this.completedThisMonth,
    required this.appointmentsThisMonth,
    required this.pendingPaymentsTotal,
    required this.topCustomers,
    this.revenueTrend = const [],
  });

  // Positive = growth, negative = decline, null = no last-month data
  double? get revenueChangePercent {
    if (revenueLastMonth == 0) return null;
    return ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;
  }

  factory AnalyticsData.fromJson(Map<String, dynamic> json) => AnalyticsData(
        revenueThisMonth: (json['revenueThisMonth'] as num).toInt(),
        revenueLastMonth: (json['revenueLastMonth'] as num).toInt(),
        completedThisMonth: (json['completedThisMonth'] as num?)?.toInt() ?? 0,
        appointmentsThisMonth:
            (json['appointmentsThisMonth'] as num?)?.toInt() ?? 0,
        pendingPaymentsTotal: (json['pendingPaymentsTotal'] as num).toInt(),
        topCustomers: (json['topCustomers'] as List)
            .map((e) => TopCustomer.fromJson(e as Map<String, dynamic>))
            .toList(),
        revenueTrend: (json['revenueTrend'] as List?)
                ?.map((e) =>
                    ((e as Map<String, dynamic>)['revenue'] as num).toInt())
                .toList() ??
            const [],
      );
}
