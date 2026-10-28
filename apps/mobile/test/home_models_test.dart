import 'package:flutter_test/flutter_test.dart';
import 'package:notionflow_mobile/features/home/home_models.dart';
import 'package:notionflow_mobile/features/tasks/record.dart';

void main() {
  test('parses a page reference', () {
    final p = PageRef.fromJson({'id': 'p1', 'title': 'Spiritual', 'icon': '🕌', 'iconName': 'moon'});
    expect(p.title, 'Spiritual');
    expect(p.icon, '🕌');
    expect(p.iconName, 'moon');
  });

  test('blocks carry exact-view details, card style and the page a table lives on', () {
    final b = Block.fromJson({
      'id': 'b1', 'type': 'database', 'exact': true, 'viewName': 'Today', 'viewUrl': 'https://notion.so/v',
      'style': 'task', 'collectionKey': 'tasks', 'pageId': 'page-1', 'pageTitle': 'Spiritual', 'items': [],
    });
    expect(b.exact, true);
    expect(b.style, CardStyle.task);
    expect(b.pageId, 'page-1');
    expect(b.items, isEmpty);
  });

  test('a database block without items stays unresolved', () {
    final b = Block.fromJson({'id': 'b2', 'type': 'database'});
    expect(b.items, isNull);
    expect(b.style, CardStyle.standard);
  });

  test('home data keeps each section style and page link', () {
    final h = HomeData.fromJson({
      'page': {'title': 'Home', 'used': ['tasks'], 'blocks': []},
      'sections': [
        {'key': 'goals', 'label': 'Goals', 'style': 'goal', 'pageId': 'pg', 'pageTitle': 'Goals page', 'items': []},
      ],
      'related': {},
    });
    expect(h.page!.used, ['tasks']);
    expect(h.sections.single.style, CardStyle.goal);
    expect(h.sections.single.pageId, 'pg');
  });

  test('page response parses with an empty-literal related map', () {
    final d = NotionPageData.fromJson({
      'page': {'id': 'p', 'title': 'Spiritual', 'icon': '🕌', 'blocks': [], 'used': []},
      'related': {},
    });
    expect(d.page.title, 'Spiritual');
    expect(d.page.icon, '🕌');
    expect(d.related, isEmpty);
  });
}
