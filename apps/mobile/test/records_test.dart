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

  test('parses a page with cursor', () {
    final p = RecordPage.fromJson({'items': [], 'nextCursor': 'abc'});
    expect(p.items, isEmpty);
    expect(p.nextCursor, 'abc');
  });
}
