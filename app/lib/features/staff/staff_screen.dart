import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/staff.dart';
import '../../l10n/app_localizations.dart';
import 'staff_provider.dart';

class StaffScreen extends ConsumerWidget {
  const StaffScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context)!;
    final staffAsync = ref.watch(staffProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l.staffTitle)),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/staff/new'),
        child: const Icon(Icons.add),
      ),
      body: staffAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(e.toString(), textAlign: TextAlign.center),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => ref.read(staffProvider.notifier).refresh(),
                  child: Text(l.buttonRetry),
                ),
              ],
            ),
          ),
        ),
        data: (staff) {
          if (staff.isEmpty) {
            return Center(
              child: Text(l.staffEmpty),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: staff.length,
            itemBuilder: (ctx, i) {
              final member = staff[i];
              return _StaffCard(
                member: member,
                onTap: () => context.push('/staff/${member.id}'),
              );
            },
          );
        },
      ),
    );
  }
}

class _StaffCard extends StatelessWidget {
  final Staff member;
  final VoidCallback onTap;

  const _StaffCard({required this.member, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final serviceNames = member.services.isEmpty
        ? l.staffNoServices
        : member.services.map((s) => s.name).join(', ');

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      member.name,
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    if (member.telegramHandle != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        '@${member.telegramHandle}',
                        style: TextStyle(
                            color: Colors.grey[600], fontSize: 12),
                      ),
                    ],
                    const SizedBox(height: 2),
                    Text(
                      serviceNames,
                      style: TextStyle(
                          color: Colors.grey[600], fontSize: 12),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
