import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/widgets/state_views.dart';
import '../records/records_screen.dart';
import '../tasks/record.dart';
import '../tasks/records_repository.dart';

final dashboardProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) {
  ref.watch(syncTickProvider);
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
            onRefresh: () async => ref.invalidate(dashboardProvider),
            child: ListView(children: [
              if (d['notion']?['configured'] == false)
                const ListTile(leading: Icon(Icons.warning_amber), title: Text('Notion is not configured on the server.')),
              ListTile(title: Text('Goal progress: ${goalAvg ?? 'n/a'}${goalAvg != null ? '%' : ''}'),
                  subtitle: Text('Learning progress: ${learnAvg ?? 'n/a'}${learnAvg != null ? '%' : ''}')),
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
