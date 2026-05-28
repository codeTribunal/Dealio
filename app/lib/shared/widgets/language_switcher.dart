import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/locale/locale_provider.dart';

/// Compact language switcher for pre-login screens (login, onboarding) where
/// no business is loaded yet. Updates the app locale immediately.
///
/// Language names are always shown in their own language, never translated.
class LanguageSwitcher extends ConsumerWidget {
  const LanguageSwitcher({super.key});

  static const _options = [
    ('uz', "O'zbek"),
    ('ru', 'Русский'),
    ('en', 'English'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final current = ref.watch(localeProvider).languageCode;
    final currentLabel =
        _options.firstWhere((o) => o.$1 == current, orElse: () => _options.first).$2;

    return PopupMenuButton<String>(
      tooltip: 'Language',
      onSelected: (code) =>
          ref.read(localeProvider.notifier).setLocale(code),
      itemBuilder: (context) => _options
          .map((o) => PopupMenuItem<String>(
                value: o.$1,
                child: Row(
                  children: [
                    if (o.$1 == current)
                      Icon(Icons.check,
                          size: 18, color: Theme.of(context).colorScheme.primary)
                    else
                      const SizedBox(width: 18),
                    const SizedBox(width: 8),
                    Text(o.$2),
                  ],
                ),
              ))
          .toList(),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.language, size: 18),
            const SizedBox(width: 6),
            Text(currentLabel, style: const TextStyle(fontWeight: FontWeight.w500)),
            const Icon(Icons.arrow_drop_down, size: 18),
          ],
        ),
      ),
    );
  }
}
