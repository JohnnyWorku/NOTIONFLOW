import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/widgets/mini_bars.dart';
import '../../core/widgets/state_views.dart';
import '../records/records_screen.dart';
import '../tasks/record.dart';
import '../tasks/records_repository.dart';

final dashboardProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) {
  ref.watch(syncVersionProvider);
  return ref.watch(recordsRepoProvider).dashboard();
});

List<NfRecord> _recs(dynamic v) =>
    (v as List? ?? const []).map((e) => NfRecord.fromJson(e as Map<String, dynamic>)).toList();

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(dashboardProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('NotionFlow')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(dashboardProvider)),
        data: (d) {
          final tasks = d['tasks'] as Map<String, dynamic>?;
          final sections = <(String, List<NfRecord>?)>[
            ('Overdue', tasks == null ? null : _recs(tasks['overdue'])),
            ('Today', tasks == null ? null : _recs(tasks['today'])),
            ('Upcoming', tasks == null ? null : _recs(tasks['upcoming'])),
            ('Active projects', d['projects'] == null ? null : _recs((d['projects'] as Map)['active'])),
            ('Recently updated', _recs(d['recent'])),
          ];
          final goalAvg = (d['goals'] as Map?)?['averageProgress'];
          final learnAvg = (d['learning'] as Map?)?['averageProgress'];
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(dashboardProvider);
              ref.invalidate(statsProvider);
            },
            child: ListView(children: [
              if ((d['notion'] as Map?)?['configured'] == false)
                const ListTile(leading: Icon(Icons.warning_amber), title: Text('Notion is not configured on the server.')),
              const _PerformanceCard(),
              ListTile(
                title: Text('Goal progress: ${goalAvg ?? 'n/a'}${goalAvg != null ? '%' : ''}'),
                subtitle: Text('Learning progress: ${learnAvg ?? 'n/a'}${learnAvg != null ? '%' : ''}'),
              ),
              for (final s in sections) ...[
                Padding(padding: const EdgeInsets.fromLTRB(16, 16, 16, 4), child: Text(s.$1, style: Theme.of(context).textTheme.titleMedium)),
                if (s.$2 == null) const ListTile(title: Text('Database not configured.'))
                else if (s.$2!.isEmpty) const ListTile(title: Text('Nothing here.'))
                else ...s.$2!.map(RecordTile.new),
              ],
            ]),
          );
        },
      ),
    );
  }
}

class _PerformanceCard extends ConsumerWidget {
  const _PerformanceCard();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.watch(statsProvider(14)).valueOrNull?['tasks'] as Map<String, dynamic>?;
    if (t == null) return const SizedBox.shrink();
    final series = (t['completedByDay'] as List).cast<Map<String, dynamic>>();
    final rate = t['completionRate'] as num?;
    final last7 = (t['last7'] as num).toInt();
    final prev7 = (t['prev7'] as num).toInt();
    return Card(
      margin: const EdgeInsets.all(12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Performance', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Wrap(spacing: 20, children: [
            Text('${rate == null ? '—' : rate.toInt()}% completed'),
            Text('$last7 done this week (${last7 - prev7 >= 0 ? '+' : ''}${last7 - prev7})'),
            Text('🔥 ${t['currentStreak']}d streak'),
          ]),
          const SizedBox(height: 12),
          MiniBars(values: series.map((e) => e['count'] as num).toList(), labels: series.map((e) => e['date'] as String).toList(), height: 56),
        ]),
      ),
    );
  }
}
