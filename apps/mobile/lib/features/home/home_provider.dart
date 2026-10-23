import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../tasks/records_repository.dart';
import 'home_models.dart';

/// Live "home": every table's recent records, resolved relations, and the optional Notion home page.
final homeProvider = FutureProvider.autoDispose<HomeData>((ref) async {
  ref.watch(syncVersionProvider);
  return HomeData.fromJson(await ref.watch(recordsRepoProvider).home());
});
