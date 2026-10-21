import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import 'record.dart';

class RecordsRepository {
  final ApiClient api;
  RecordsRepository(this.api);

  Future<RecordPage> list(String kind, {String? search, bool overdue = false}) async {
    final data = await api.request('GET', '/$kind', query: {
      'pageSize': 50,
      if (search != null && search.isNotEmpty) 'search': search,
      if (overdue) 'overdue': true,
    });
    return RecordPage.fromJson(data as Map<String, dynamic>);
  }

  /// [idempotencyKey] must be reused when retrying the same submission so no duplicate page is created.
  Future<NfRecord> create(String kind, Map<String, dynamic> body, String idempotencyKey) async {
    final data = await api.request('POST', '/$kind', data: body, headers: {'Idempotency-Key': idempotencyKey});
    return NfRecord.fromJson(data as Map<String, dynamic>);
  }

  Future<NfRecord> update(String kind, NfRecord r, Map<String, dynamic> changes) async {
    final data = await api.request('PATCH', '/$kind/${r.id}', data: {'expectedLastEdited': r.lastEdited, ...changes});
    return NfRecord.fromJson(data as Map<String, dynamic>);
  }

  Future<int> syncVersion() async {
    final data = await api.request('GET', '/sync/status');
    return (data as Map<String, dynamic>)['version'] as int;
  }

  Future<Map<String, dynamic>> dashboard() async => (await api.request('GET', '/dashboard')) as Map<String, dynamic>;
}

final recordsRepoProvider = Provider((ref) => RecordsRepository(ref.watch(apiClientProvider)));

/// Polls the sync version; when it changes, dependents refetch (Notion edits / other client's writes).
final syncTickProvider = StreamProvider<int>((ref) async* {
  final repo = ref.watch(recordsRepoProvider);
  while (true) {
    try {
      yield await repo.syncVersion();
    } catch (_) {/* offline: keep last value */}
    await Future<void>.delayed(const Duration(seconds: 15));
  }
});

final recordsProvider = FutureProvider.autoDispose.family<RecordPage, ({String kind, String search, bool overdue})>((ref, p) {
  ref.watch(syncTickProvider); // refetch on version change
  return ref.watch(recordsRepoProvider).list(p.kind, search: p.search, overdue: p.overdue);
});
