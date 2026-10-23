import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/icon_map.dart';
import '../../core/widgets/state_views.dart';
import '../tasks/records_repository.dart';

/// Hub listing every connected Notion table (built-in and custom).
class CollectionsScreen extends ConsumerWidget {
  const CollectionsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(collectionsProvider);
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Your tables')),
      body: async.when(
        loading: () => const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 4, itemHeight: 110)),
        error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(collectionsProvider)),
        data: (cols) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(collectionsProvider),
          child: GridView.count(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
            crossAxisCount: 2,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.15,
            children: [
              for (final c in cols)
                Opacity(
                  opacity: c.configured ? 1 : 0.5,
                  child: AppCard(
                    onTap: c.configured ? () => context.go('/collections/${c.key}') : null,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Container(
                        width: 42, height: 42,
                        decoration: BoxDecoration(color: cs.primaryContainer, borderRadius: BorderRadius.circular(13)),
                        child: Icon(collectionIcon(c.icon), color: cs.onPrimaryContainer),
                      ),
                      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(c.label, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                        Text(c.configured ? (c.builtin ? 'Built-in' : 'Custom table') : 'Not configured', style: Theme.of(context).textTheme.bodySmall),
                      ]),
                    ]),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
