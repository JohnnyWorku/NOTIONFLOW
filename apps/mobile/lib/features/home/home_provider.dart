import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../tasks/records_repository.dart';
import 'home_models.dart';

/// One Notion page mirrored with live lists.
final pageViewProvider = FutureProvider.autoDispose.family<NotionPageData, String>((ref, id) async {
  ref.watch(syncVersionProvider);
  return NotionPageData.fromJson(await ref.watch(recordsRepoProvider).pageView(id, DateTime.now().timeZoneOffset.inMinutes));
});

/// Live "home": every table's recent records, resolved relations, and the optional Notion home page.
final homeProvider = FutureProvider.autoDispose<HomeData>((ref) async {
  ref.watch(syncVersionProvider);
  return HomeData.fromJson(await ref.watch(recordsRepoProvider).home(DateTime.now().timeZoneOffset.inMinutes));
});
