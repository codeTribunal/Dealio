import 'package:flutter/material.dart';

import '../../core/theme/app_tokens.dart';

/// Size of an [AppAvatar].
enum AppAvatarSize { sm, md, lg }

/// Circular initials avatar: [AppTokens.accentSoft] fill, accent semibold
/// initials derived from [name].
class AppAvatar extends StatelessWidget {
  final String name;
  final AppAvatarSize size;

  const AppAvatar({super.key, required this.name, this.size = AppAvatarSize.md});

  double get _diameter => switch (size) {
        AppAvatarSize.sm => 32,
        AppAvatarSize.md => 40,
        AppAvatarSize.lg => 48,
      };

  double get _fontSize => switch (size) {
        AppAvatarSize.sm => AppTextSizes.caption,
        AppAvatarSize.md => AppTextSizes.sm,
        AppAvatarSize.lg => AppTextSizes.base,
      };

  /// First letters of up to the first two words, uppercased. Falls back to "?".
  static String initialsOf(String name) {
    final parts =
        name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts[1].characters.first)
        .toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppTokens.of(context);
    return Container(
      width: _diameter,
      height: _diameter,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: t.accentSoft, shape: BoxShape.circle),
      child: Text(
        initialsOf(name),
        style: TextStyle(
          color: t.accent,
          fontSize: _fontSize,
          fontWeight: AppFontWeights.semibold,
        ),
      ),
    );
  }
}
