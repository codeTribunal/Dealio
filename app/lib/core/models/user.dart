class User {
  final String id;
  final String phone;

  const User({required this.id, required this.phone});

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        phone: json['phone'] as String,
      );
}
