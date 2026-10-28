import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/state_views.dart';
import '../home/home_models.dart';
import '../home/home_provider.dart';
import '../home/notion_blocks.dart';

void _openBlock(BuildContext context, Block b) {
  if (b.collectionKey != null) {
    context.go('/collections/${b.collectionKey}');
  } else if (b.url != null) {
    launchUrl(Uri.parse(b.url!), mode: LaunchMode.externalApplication);
  }
}

/// A Notion page mirrored in the app: its text and sub-pages, plus every table on it as a live list using the view's own filter.
class NotionPageScreen extends ConsumerWidget {
  final String id;
  const NotionPageScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(pageViewProvider(id));
    final page = async.valueOrNull?.page;
    return Scaffold(
      appBar: AppBar(
        title: Text('${page?.icon != null ? '${page!.icon} ' : ''}${page?.title ?? 'Page'}'),
        actions: [
          if (page?.url != null)
            IconButton(tooltip: 'Open in Notion', icon: const Icon(Icons.open_in_new), onPressed: () => launchUrl(Uri.parse(page!.url!), mode: LaunchMode.externalApplication)),
        ],
      ),
      body: async.when(
        loading: () => const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 4, itemHeight: 110)),
        error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(pageViewProvider(id))),
        data: (d) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(pageViewProvider(id)),
          child: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 32), children: [
            if (d.page.error != null)
              AppCard(child: Text(d.page.error!))
            else if (d.page.blocks.isEmpty)
              const SizedBox(height: 240, child: EmptyView('This page is empty.'))
            else
              AppCard(
                child: NotionBlocksView(
                  blocks: d.page.blocks,
                  related: d.related,
                  onOpen: (b) => _openBlock(context, b),
                  onOpenPage: (pid) => context.go('/collections/page/$pid'),
                ),
              ),
            if (d.page.skipped > 0 || d.page.truncated)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '${d.page.skipped > 0 ? '${d.page.skipped} block(s) (images, embeds) can’t be shown here. ' : ''}${d.page.truncated ? 'Showing the first part of a long page.' : ''}',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
          ]),
        ),
      ),
    );
  }
}
