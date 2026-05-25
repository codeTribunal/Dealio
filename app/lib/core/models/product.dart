class Product {
  final String id;
  final String name;
  final String? description;
  final int price;
  final List<String> photos;
  final int? stockQty;
  final bool unlimited;
  final String? prepTime;
  final bool active;
  final DateTime createdAt;

  const Product({
    required this.id,
    required this.name,
    this.description,
    required this.price,
    required this.photos,
    this.stockQty,
    required this.unlimited,
    this.prepTime,
    required this.active,
    required this.createdAt,
  });

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        name: json['name'] as String,
        description: json['description'] as String?,
        price: json['price'] as int,
        photos: (json['photos'] as List? ?? [])
            .map((e) => e as String)
            .toList(),
        stockQty: json['stockQty'] as int?,
        unlimited: json['unlimited'] as bool? ?? false,
        prepTime: json['prepTime'] as String?,
        active: json['active'] as bool? ?? true,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );

  Product copyWith({bool? active, int? stockQty, bool? unlimited}) => Product(
        id: id,
        name: name,
        description: description,
        price: price,
        photos: photos,
        stockQty: stockQty ?? this.stockQty,
        unlimited: unlimited ?? this.unlimited,
        prepTime: prepTime,
        active: active ?? this.active,
        createdAt: createdAt,
      );

  String get stockLabel {
    if (unlimited) return 'Unlimited';
    if (stockQty == null) return 'No stock info';
    if (stockQty == 0) return 'Out of stock';
    return 'In stock: $stockQty';
  }
}
