import '../tasks/record.dart';

class Seg {
  final String text;
  final bool bold, italic, code, strike;
  final String? href;
  const Seg({required this.text, this.bold = false, this.italic = false, this.code = false, this.strike = false, this.href});
  factory Seg.fromJson(Map<String, dynamic> j) => Seg(
        text: j['text'] as String,
        bold: j['bold'] == true,
        italic: j['italic'] == true,
        code: j['code'] == true,
        strike: j['strike'] == true,
        href: j['href'] as String?,
      );
}

/// A block of the mirrored Notion home page (see server/src/home/home.util.ts).
class Block {
  final String id, type;
  final int level;
  final List<Seg> text;
  final bool checked;
  final String? icon, title, url, collectionKey, heading, preset, viewName, viewUrl, error, pageId, pageTitle;
  final List<Block> children;

  /// Live records for a database view the server resolved from the heading above it (null = not resolved).
  final List<NfRecord>? items;
  final bool hasMore;

  /// true = the filter and sorts come from the real Notion view; false = guessed from the heading.
  final bool exact;
  final CardStyle style;
  const Block({
    required this.id, required this.type, this.level = 0, this.text = const [], this.checked = false,
    this.icon, this.title, this.url, this.collectionKey, this.children = const [],
    this.items, this.hasMore = false, this.heading, this.preset,
    this.viewName, this.viewUrl, this.error, this.exact = false, this.style = CardStyle.standard, this.pageId, this.pageTitle,
  });
  factory Block.fromJson(Map<String, dynamic> j) => Block(
        id: j['id'] as String,
        type: j['type'] as String,
        level: (j['level'] as num?)?.toInt() ?? 0,
        text: ((j['text'] as List?) ?? const []).map((e) => Seg.fromJson(e as Map<String, dynamic>)).toList(),
        checked: j['checked'] == true,
        icon: j['icon'] as String?,
        title: j['title'] as String?,
        url: j['url'] as String?,
        collectionKey: j['collectionKey'] as String?,
        children: ((j['children'] as List?) ?? const []).map((e) => Block.fromJson(e as Map<String, dynamic>)).toList(),
        items: j['items'] == null ? null : (j['items'] as List).map((e) => NfRecord.fromJson(e as Map<String, dynamic>)).toList(),
        hasMore: j['hasMore'] == true,
        heading: j['heading'] as String?,
        preset: j['preset'] as String?,
        viewName: j['viewName'] as String?,
        viewUrl: j['viewUrl'] as String?,
        error: j['error'] as String?,
        exact: j['exact'] == true,
        style: cardStyleFrom(j['style'] as String?),
        pageId: j['pageId'] as String?,
        pageTitle: j['pageTitle'] as String?,
      );
}

class HomePage {
  final String title;
  final String? url, error, icon;
  final List<Block> blocks;
  final List<String> used; // table keys already shown by live views on the page
  final int skipped;
  final bool truncated;
  const HomePage({required this.title, this.url, this.error, this.icon, this.blocks = const [], this.used = const [], this.skipped = 0, this.truncated = false});
  factory HomePage.fromJson(Map<String, dynamic> j) => HomePage(
        title: (j['title'] ?? 'Home') as String,
        url: j['url'] as String?,
        error: j['error'] as String?,
        icon: j['icon'] as String?,
        blocks: ((j['blocks'] as List?) ?? const []).map((e) => Block.fromJson(e as Map<String, dynamic>)).toList(),
        used: ((j['used'] as List?) ?? const []).cast<String>(),
        skipped: (j['skipped'] as num?)?.toInt() ?? 0,
        truncated: j['truncated'] == true,
      );
}

class HomeSection {
  final String key, label;
  final String? icon, error, pageId, pageTitle;
  final bool hasMore;
  final CardStyle style;
  final List<NfRecord> items;
  const HomeSection({required this.key, required this.label, this.icon, this.error, this.pageId, this.pageTitle, this.hasMore = false, this.style = CardStyle.standard, this.items = const []});
  factory HomeSection.fromJson(Map<String, dynamic> j) => HomeSection(
        key: j['key'] as String,
        label: j['label'] as String,
        icon: j['icon'] as String?,
        error: j['error'] as String?,
        pageId: j['pageId'] as String?,
        pageTitle: j['pageTitle'] as String?,
        hasMore: j['hasMore'] == true,
        style: cardStyleFrom(j['style'] as String?),
        items: ((j['items'] as List?) ?? const []).map((e) => NfRecord.fromJson(e as Map<String, dynamic>)).toList(),
      );
}

class HomeData {
  final HomePage? page;
  final List<HomeSection> sections;
  final Map<String, RelatedInfo> related;
  const HomeData({this.page, this.sections = const [], this.related = const {}});
  factory HomeData.fromJson(Map<String, dynamic> j) => HomeData(
        page: j['page'] == null ? null : HomePage.fromJson(j['page'] as Map<String, dynamic>),
        sections: ((j['sections'] as List?) ?? const []).map((e) => HomeSection.fromJson(e as Map<String, dynamic>)).toList(),
        related: {
          for (final e in ((j['related'] as Map?) ?? const {}).cast<String, dynamic>().entries) e.key: RelatedInfo.fromJson(e.value as Map<String, dynamic>),
        },
      );

  List<RelatedInfo> relatedFor(NfRecord r) => [for (final id in r.relatedIds) if (related[id] != null) related[id]!];
}

/// Response of GET /pages/:id: a mirrored Notion page plus the titles of records its lists link to.
class NotionPageData {
  final HomePage page;
  final Map<String, RelatedInfo> related;
  const NotionPageData({required this.page, this.related = const {}});
  factory NotionPageData.fromJson(Map<String, dynamic> j) => NotionPageData(
        page: HomePage.fromJson(j['page'] as Map<String, dynamic>),
        related: {
          for (final e in ((j['related'] as Map?) ?? const {}).cast<String, dynamic>().entries) e.key: RelatedInfo.fromJson(e.value as Map<String, dynamic>),
        },
      );
}
