import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/format.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/icon_map.dart';
import '../../core/widgets/mini_bars.dart';
import '../../core/widgets/record_card.dart';
import '../../core/widgets/state_views.dart';
import '../home/home_models.dart';
import '../home/home_provider.dart';
import '../home/notion_blocks.dart';
import '../records/record_form.dart';
import '../tasks/record.dart';
import '../tasks/records_repository.dart';

final dashboardProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) {
  ref.watch(syncVersionProvider);
  return ref.watch(recordsRepoProvider).dashboard();
});

List<NfRecord> _recs(dynamic v) => (v as List? ?? const []).map((e) => NfRecord.fromJson(e as Map<String, dynamic>)).toList();

/// Home: header with today's numbers, performance, your Notion home page, focus lists, and a card per connected table.
class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  Future<void> _quickAdd(BuildContext context, WidgetRef ref) async {
    final cols = (ref.read(collectionsProvider).valueOrNull ?? const <CollectionInfo>[]).where((c) => c.configured).toList();
    if (cols.isEmpty) return;
    final picked = await showModalBottomSheet<CollectionInfo>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: ListView(shrinkWrap: true, children: [
          const Padding(padding: EdgeInsets.fromLTRB(20, 0, 20, 8), child: Text('Quick add to…', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
          for (final c in cols)
            ListTile(leading: CircleAvatar(child: Icon(collectionIcon(c.icon))), title: Text(c.label), onTap: () => Navigator.pop(ctx, c)),
        ]),
      ),
    );
    if (picked == null || !context.mounted) return;
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => RecordFormSheet(kind: picked.key, label: picked.label),
    );
    if (changed == true) {
      ref.invalidate(dashboardProvider);
      ref.invalidate(homeProvider);
      ref.invalidate(statsProvider);
    }
  }

  void _openBlock(BuildContext context, Block b) {
    if (b.collectionKey != null) {
      context.go('/collections/${b.collectionKey}');
    } else if (b.url != null) {
      launchUrl(Uri.parse(b.url!), mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dash = ref.watch(dashboardProvider);
    final home = ref.watch(homeProvider);
    final tasks = dash.valueOrNull?['tasks'] as Map<String, dynamic>?;
    final overdue = tasks == null ? <NfRecord>[] : _recs(tasks['overdue']);
    final today = tasks == null ? <NfRecord>[] : _recs(tasks['today']);
    final upcoming = tasks == null ? <NfRecord>[] : _recs(tasks['upcoming']);
    // When the Notion home page is mirrored with live views, it IS the main body: no duplicate Today / tables sections.
    final page = home.valueOrNull?.page;
    final mirrored = page != null && page.error == null && page.blocks.isNotEmpty;
    final others = [for (final s in home.valueOrNull?.sections ?? const <HomeSection>[]) if (!(page?.used.contains(s.key) ?? false)) s];

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(onPressed: () => _quickAdd(context, ref), icon: const Icon(Icons.add), label: const Text('Quick add')),
      body: RefreshIndicator(
        edgeOffset: 120,
        onRefresh: () async {
          ref.invalidate(dashboardProvider);
          ref.invalidate(homeProvider);
          ref.invalidate(statsProvider);
          await ref.read(dashboardProvider.future).catchError((_) => <String, dynamic>{});
        },
        child: CustomScrollView(slivers: [
          SliverToBoxAdapter(
            child: _Header(
              overdue: tasks == null ? null : overdue.length,
              today: tasks == null ? null : today.length,
              upcoming: tasks == null ? null : upcoming.length,
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 110),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                if ((dash.valueOrNull?['notion'] as Map?)?['configured'] == false)
                  const Padding(
                    padding: EdgeInsets.only(top: 12),
                    child: AppCard(child: Row(children: [Icon(Icons.warning_amber_rounded), SizedBox(width: 12), Expanded(child: Text('Notion is not configured on the server.'))])),
                  ),
                if (((dash.valueOrNull?['warnings'] as List?) ?? const []).isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: AppCard(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        const Text('Some tables could not be loaded:', style: TextStyle(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 6),
                        for (final w in (dash.value!['warnings'] as List).cast<String>()) Text('• $w'),
                      ]),
                    ),
                  ),
                if (dash.hasError) Padding(padding: const EdgeInsets.only(top: 12), child: SizedBox(height: 200, child: ErrorView(error: dash.error!, onRetry: () => ref.invalidate(dashboardProvider)))),
                const SectionHeader('Performance'),
                const _PerformanceCard(),
                if (page != null) ...[
                  SectionHeader(page.title),
                  AppCard(
                    child: page.error != null
                        ? Text(page.error!)
                        : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            NotionBlocksView(blocks: page.blocks, related: home.value!.related, onOpen: (b) => _openBlock(context, b)),
                            if (page.skipped > 0 || page.truncated)
                              Text(
                                '${page.skipped > 0 ? '${page.skipped} block(s) (images, embeds) can’t be shown here. ' : ''}${page.truncated ? 'Showing the first part of a long page.' : ''}',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                          ]),
                  ),
                ],
                if (overdue.isNotEmpty) ...[
                  SectionHeader('Overdue', count: overdue.length),
                  for (final r in overdue.take(5)) Padding(padding: const EdgeInsets.only(bottom: 8), child: RecordCard(r)),
                ],
                if (!mirrored) ...[
                  SectionHeader('Today', count: today.length),
                  if (today.isEmpty)
                    const AppCard(child: Text('No tasks due today.'))
                  else
                    for (final r in today.take(6)) Padding(padding: const EdgeInsets.only(bottom: 8), child: RecordCard(r)),
                  if (upcoming.isNotEmpty) ...[
                    SectionHeader('Upcoming', count: upcoming.length),
                    for (final r in upcoming.take(4)) Padding(padding: const EdgeInsets.only(bottom: 8), child: RecordCard(r)),
                  ],
                ],
                if (!mirrored || others.isNotEmpty) SectionHeader(mirrored ? 'Other tables' : 'Your tables'),
                home.when(
                  loading: () => const SkeletonList(count: 3, itemHeight: 140),
                  error: (e, _) => SizedBox(height: 200, child: ErrorView(error: e, onRetry: () => ref.invalidate(homeProvider))),
                  data: (h) => Column(children: [
                    for (final s in (mirrored ? others : h.sections)) Padding(padding: const EdgeInsets.only(bottom: 12), child: _TableCard(section: s, data: h)),
                  ]),
                ),
              ]),
            ),
          ),
        ]),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final int? overdue, today, upcoming;
  const _Header({this.overdue, this.today, this.upcoming});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    Widget stat(String label, int? v) => Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
            decoration: BoxDecoration(color: const Color.fromRGBO(255, 255, 255, 0.16), borderRadius: BorderRadius.circular(16)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(v == null ? '–' : '$v', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: cs.onPrimary)),
              Text(label, style: TextStyle(fontSize: 12, color: cs.primaryContainer)),
            ]),
          ),
        );
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [cs.primary, Color.lerp(cs.primary, cs.tertiary, 0.55)!]),
        borderRadius: const BorderRadius.vertical(bottom: Radius.circular(30)),
      ),
      padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 20, 20, 22),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(longDate(DateTime.now()), style: TextStyle(color: cs.primaryContainer, fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 2),
        Text(greeting(), style: TextStyle(color: cs.onPrimary, fontSize: 28, fontWeight: FontWeight.w800)),
        const SizedBox(height: 18),
        Row(children: [stat('Overdue', overdue), const SizedBox(width: 10), stat('Today', today), const SizedBox(width: 10), stat('Upcoming', upcoming)]),
      ]),
    );
  }
}

class _PerformanceCard extends ConsumerWidget {
  const _PerformanceCard();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stats = ref.watch(statsProvider(14));
    final cs = Theme.of(context).colorScheme;
    if (stats.isLoading && !stats.hasValue) return const SkeletonList(count: 1, itemHeight: 150);
    final t = stats.valueOrNull?['tasks'] as Map<String, dynamic>?;
    if (t == null) return const AppCard(child: Text('Connect your Tasks database to see your performance.'));
    final series = (t['completedByDay'] as List).cast<Map<String, dynamic>>();
    final rate = (t['completionRate'] as num?)?.toInt();
    final last7 = (t['last7'] as num).toInt();
    final delta = last7 - (t['prev7'] as num).toInt();
    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          SizedBox(
            width: 72, height: 72,
            child: Stack(alignment: Alignment.center, children: [
              SizedBox.expand(child: CircularProgressIndicator(value: (rate ?? 0) / 100, strokeWidth: 7, strokeCap: StrokeCap.round, backgroundColor: cs.surfaceContainerHighest)),
              Text(rate == null ? '—' : '$rate%', style: const TextStyle(fontWeight: FontWeight.w700)),
            ]),
          ),
          const SizedBox(width: 18),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('$last7 done this week', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('${delta >= 0 ? '▲ +$delta' : '▼ $delta'} vs last week  ·  🔥 ${t['currentStreak']}-day streak', style: Theme.of(context).textTheme.bodySmall),
            ]),
          ),
        ]),
        const SizedBox(height: 16),
        MiniBars(values: series.map((e) => e['count'] as num).toList(), labels: series.map((e) => e['date'] as String).toList(), height: 56),
      ]),
    );
  }
}

class _TableCard extends StatelessWidget {
  final HomeSection section;
  final HomeData data;
  const _TableCard({required this.section, required this.data});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return AppCard(
      padding: const EdgeInsets.fromLTRB(14, 8, 14, 14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 34, height: 34,
            decoration: BoxDecoration(color: cs.primaryContainer, borderRadius: BorderRadius.circular(10)),
            child: Icon(collectionIcon(section.icon), size: 18, color: cs.onPrimaryContainer),
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(section.label, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700))),
          TextButton(onPressed: () => context.go('/collections/${section.key}'), child: Text(section.hasMore ? 'View all' : 'Open')),
        ]),
        if (section.error != null)
          Text(section.error!, style: TextStyle(color: cs.error))
        else if (section.items.isEmpty)
          Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Text('Nothing here yet.', style: TextStyle(color: cs.onSurfaceVariant)))
        else
          for (final r in section.items) Padding(padding: const EdgeInsets.only(top: 8), child: RecordCard(r, flat: true, related: data.relatedFor(r))),
      ]),
    );
  }
}
