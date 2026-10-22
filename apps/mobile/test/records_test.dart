import 'package:flutter_test/flutter_test.dart';
import 'package:notionflow_mobile/features/tasks/record.dart';

void main() {
  test('parses a record and builds a subtitle', () {
    final r = NfRecord.fromJson({
      'id': 'p1', 'url': 'u', 'title': 'Read', 'lastEdited': '2026-01-01T00:00:00.000Z',
      'status': 'Todo', 'priority': null, 'due': '2026-02-01', 'done': false, 'progress': 40,
    });
    expect(r.title, 'Read');
    expect(r.done, false);
    expect(r.subtitle, 'Todo · due 2026-02-01 · 40%');
  });

  test('shows amount in the subtitle', () {
    final r = NfRecord.fromJson({'id': 'p', 'url': 'u', 'title': 'Quran', 'lastEdited': 'x', 'amount': 12});
    expect(r.subtitle, '12');
  });

  test('parses a page with cursor', () {
    final p = RecordPage.fromJson({'items': [], 'nextCursor': 'abc'});
    expect(p.items, isEmpty);
    expect(p.nextCursor, 'abc');
  });

  test('parses collection metadata and ignores unmapped fields', () {
    final m = CollectionMeta.fromJson({
      'fields': {'title': 'Name', 'status': 'Status', 'amount': 'Pages'},
      'options': {'status': ['Todo', 'Done'], 'priority': []},
    });
    expect(m.has('status'), true);
    expect(m.has('due'), false);
    expect(m.statuses, ['Todo', 'Done']);
  });
}
