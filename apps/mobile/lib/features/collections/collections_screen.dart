import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/widgets/icon_map.dart';
import '../../core/widgets/state_views.dart';
import '../tasks/records_repository.dart';

/// Hub listing every connected Notion table (built-in and custom).
class CollectionsScreen extends ConsumerWidget {
  const CollectionsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(collectionsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Your tables')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(collectionsProvider)),
        data: (cols) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(collectionsProvider),
          child: ListView(
            children: [
              for (final c in cols)
                ListTile(
                  enabled: c.configured,
                  leading: CircleAvatar(child: Icon(collectionIcon(c.icon))),
                  title: Text(c.label),
                  subtitle: Text(c.configured ? (c.builtin ? 'Built-in' : 'Custom table') : 'Not configured on the server'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: c.configured ? () => context.go('/collections/${c.key}') : null,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
