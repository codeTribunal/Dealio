class BlockedSlot {
  final String id;
  final String? staffId; // null = whole-business block
  final String startTime; // UTC ISO instant
  final String endTime; // UTC ISO instant
  final String? reason;
  final String? staffName;

  const BlockedSlot({
    required this.id,
    required this.staffId,
    required this.startTime,
    required this.endTime,
    this.reason,
    this.staffName,
  });

  factory BlockedSlot.fromJson(Map<String, dynamic> json) {
    final staff = json['staff'];
    return BlockedSlot(
      id: json['id'] as String,
      staffId: json['staffId'] as String?,
      startTime: json['startTime'] as String,
      endTime: json['endTime'] as String,
      reason: json['reason'] as String?,
      staffName: staff is Map ? staff['name'] as String? : null,
    );
  }
}
