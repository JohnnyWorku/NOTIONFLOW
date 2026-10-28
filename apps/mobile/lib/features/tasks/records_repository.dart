import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import 'record.dart';

class RecordsRepository {
  final ApiClient api;
  RecordsRepository(this.api);

  Future<List<CollectionInfo>> collections() async {
    final data = await api.request('GET', '/collections');
    return (data as List).map((e) => CollectionInfo.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<CollectionMeta> meta(String kind) async =>
      CollectionMeta.fromJson((await api.request('GET', '/c/$kind/meta')) as Map<String, dynamic>);

  Future<RecordPage> list(String kind, {String? search, bool overdue = false, String? cursor}) async {
    final data = await api.request('GET', '/c/$kind', query: {
      'pageSize': 30,
      if (search != null && search.isNotEmpty) 'search': search,
      if (overdue) 'overdue': true,
      if (cursor != null) 'cursor': cursor,
    });
    return RecordPage.fromJson(data as Map<String, dynamic>);
  }

  /// [idempotencyKey] must be reused when retrying the same submission so no duplicate page is created.
  Future<NfRecord> create(String kind, Map<String, dynamic> body, String idempotencyKey) async {
    final data = await api.request('POST', '/c/$kind', data: body, headers: {'Idempotency-Key': idempotencyKey});
    return NfRecord.fromJson(data as Map<String, dynamic>);
  }

  Future<NfRecord> update(String kind, NfRecord r, Map<String, dynamic> changes) async {
    final data = await api.request('PATCH', '/c/$kind/${r.id}', data: {'expectedLastEdited': r.lastEdited, ...changes});
    return NfRecord.fromJson(data as Map<String, dynamic>);
  }

  Future<void> delete(String kind, NfRecord r) async {
    await api.request('DELETE', '/c/$kind/${r.id}');
  }

  Future<int> syncVersion() async {
    final data = await api.request('GET', '/sync/status');
    return (data as Map<String, dynamic>)['version'] as int;
  }

  Future<Map<String, dynamic>> home(int tzMinutes) async =>
      (await api.request('GET', '/home', query: {'tz': tzMinutes})) as Map<String, dynamic>;

  Future<List<PageRef>> pages(int tzMinutes) async {
    final data = await api.request('GET', '/pages', query: {'tz': tzMinutes});
    return (data as List).map((e) => PageRef.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> pageView(String id, int tzMinutes) async =>
      (await api.request('GET', '/pages/$id', query: {'tz': tzMinutes})) as Map<String, dynamic>;

  /// The Notion page a table lives on, or null (the server answers with an empty body then).
  Future<PageRef?> pageOf(String key) async {
    final data = await api.request('GET', '/home/page-of/$key');
    return data is Map<String, dynamic> ? PageRef.fromJson(data) : null;
  }

  Future<Map<String, dynamic>> dashboard() async => (await api.request('GET', '/dashboard')) as Map<String, dynamic>;

  Future<Map<String, dynamic>> stats(int days, int tzMinutes) async =>
      (await api.request('GET', '/stats', query: {'days': days, 'tz': tzMinutes})) as Map<String, dynamic>;
}

final recordsRepoProvider = Provider((ref) => RecordsRepository(ref.watch(apiClientProvider)));

/// Polls the sync version every 15s (Notion edits / other client's writes).
final syncTickProvider = StreamProvider<int>((ref) async* {
  final repo = ref.watch(recordsRepoProvider);
  while (true) {
    try {
      yield await repo.syncVersion();
    } catch (_) {/* offline or signed out: keep last value */}
    await Future<void>.delayed(const Duration(seconds: 15));
  }
});

/// Only changes when the server version changes, so dependents refetch exactly when needed.
final syncVersionProvider = Provider<int?>((ref) => ref.watch(syncTickProvider).valueOrNull);

final pagesProvider = FutureProvider<List<PageRef>>((ref) => ref.watch(recordsRepoProvider).pages(DateTime.now().timeZoneOffset.inMinutes));

final pageOfProvider = FutureProvider.family<PageRef?, String>((ref, key) => ref.watch(recordsRepoProvider).pageOf(key));

final collectionsProvider = FutureProvider<List<CollectionInfo>>((ref) => ref.watch(recordsRepoProvider).collections());

final metaProvider = FutureProvider.family<CollectionMeta, String>((ref, kind) => ref.watch(recordsRepoProvider).meta(kind));

final statsProvider = FutureProvider.autoDispose.family<Map<String, dynamic>, int>((ref, days) {
  ref.watch(syncVersionProvider);
  return ref.watch(recordsRepoProvider).stats(days, DateTime.now().timeZoneOffset.inMinutes);
});
