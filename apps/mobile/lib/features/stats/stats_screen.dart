import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/icon_map.dart';
import '../../core/widgets/mini_bars.dart';
import '../../core/widgets/state_views.dart';
import '../tasks/records_repository.dart';

int _i(dynamic v) => v is num ? v.toInt() : 0;
List<num> _series(dynamic list) => ((list as List?) ?? const []).map((e) => (e as Map)['count'] as num).toList();
List<String> _labels(dynamic list) => ((list as List?) ?? const []).map((e) => (e as Map)['date'] as String).toList();

class StatsScreen extends ConsumerStatefulWidget {
  const StatsScreen({super.key});
  @override
  ConsumerState<StatsScreen> createState() => _StatsState();
}

class _StatsState extends ConsumerState<StatsScreen> {
  int _days = 30;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(statsProvider(_days));
    return Scaffold(
      appBar: AppBar(title: const Text('Statistics')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(statsProvider(_days))),
        data: (s) {
          final t = s['tasks'] as Map<String, dynamic>?;
          final cols = (s['collections'] as List).cast<Map<String, dynamic>>();
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(statsProvider(_days)),
            child: ListView(padding: const EdgeInsets.all(16), children: [
              SegmentedButton<int>(
                segments: const [
                  ButtonSegment(value: 7, label: Text('7 days')),
                  ButtonSegment(value: 30, label: Text('30 days')),
                  ButtonSegment(value: 90, label: Text('90 days')),
                ],
                selected: {_days},
                onSelectionChanged: (v) => setState(() => _days = v.first),
              ),
              const SizedBox(height: 14),
              if (t == null)
                const AppCard(child: Text('Connect your Tasks database to see task performance.'))
              else
                _TasksCard(t: t, days: _days),
              for (final c in cols) _CollectionCard(c: c, days: _days),
            ]),
          );
        },
      ),
    );
  }
}

class _TasksCard extends StatelessWidget {
  final Map<String, dynamic> t;
  final int days;
  const _TasksCard({required this.t, required this.days});

  @override
  Widget build(BuildContext context) {
    final rate = t['completionRate'];
    final last7 = _i(t['last7']);
    final prev7 = _i(t['prev7']);
    final delta = last7 - prev7;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Tasks', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 12),
          Row(children: [
            SizedBox(
              width: 84, height: 84,
              child: Stack(alignment: Alignment.center, children: [
                SizedBox.expand(child: CircularProgressIndicator(value: rate == null ? 0 : _i(rate) / 100, strokeWidth: 8)),
                Text(rate == null ? '—' : '${_i(rate)}%', style: Theme.of(context).textTheme.titleMedium),
              ]),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Wrap(spacing: 20, runSpacing: 8, children: [
                _Metric('Done', '${_i(t['done'])}'),
                _Metric('Open', '${_i(t['open'])}'),
                _Metric('Overdue', '${_i(t['overdue'])}'),
                _Metric('Last 7 days', '$last7 (${delta >= 0 ? '+' : ''}$delta)'),
                _Metric('Streak', '${_i(t['currentStreak'])}d'),
                _Metric('Best streak', '${_i(t['longestStreak'])}d'),
              ]),
            ),
          ]),
          const SizedBox(height: 16),
          Text('Completed per day (${days}d)', style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 8),
          MiniBars(values: _series(t['completedByDay']), labels: _labels(t['completedByDay'])),
          const SizedBox(height: 8),
          Text('Completion day is estimated from the last edit in Notion.', style: Theme.of(context).textTheme.bodySmall),
        ]),
      ),
    );
  }
}

class _CollectionCard extends StatelessWidget {
  final Map<String, dynamic> c;
  final int days;
  const _CollectionCard({required this.c, required this.days});

  @override
  Widget build(BuildContext context) {
    final hasAmount = c['hasAmount'] == true && (c['amountInRange'] as num) > 0;
    final series = hasAmount ? c['amountByDay'] : c['entriesByDay'];
    final avg = c['avgProgress'];
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(collectionIcon(c['icon'] as String?), size: 20, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 8),
            Text(c['label'] as String, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          ]),
          const SizedBox(height: 12),
          Wrap(spacing: 20, runSpacing: 8, children: [
            _Metric('Records', '${_i(c['total'])}${c['truncated'] == true ? '+' : ''}'),
            _Metric('In ${days}d', '${_i(c['entriesInRange'])}'),
            if (hasAmount) _Metric('Total (${days}d)', '${(c['amountInRange'] as num).round()}')
            else if (avg != null) _Metric('Avg progress', '${_i(avg)}%'),
          ]),
          const SizedBox(height: 12),
          MiniBars(values: _series(series), labels: _labels(series), height: 56),
        ]),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  final String label, value;
  const _Metric(this.label, this.value);
  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        Text(value, style: Theme.of(context).textTheme.titleMedium),
      ]);
}
