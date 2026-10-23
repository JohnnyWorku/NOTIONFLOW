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
  final String? icon, title, url, collectionKey;
  final List<Block> children;
  const Block({
    required this.id, required this.type, this.level = 0, this.text = const [], this.checked = false,
    this.icon, this.title, this.url, this.collectionKey, this.children = const [],
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
      );
}

class HomePage {
  final String title;
  final String? url, error;
  final List<Block> blocks;
  final int skipped;
  final bool truncated;
  const HomePage({required this.title, this.url, this.error, this.blocks = const [], this.skipped = 0, this.truncated = false});
  factory HomePage.fromJson(Map<String, dynamic> j) => HomePage(
        title: (j['title'] ?? 'Home') as String,
        url: j['url'] as String?,
        error: j['error'] as String?,
        blocks: ((j['blocks'] as List?) ?? const []).map((e) => Block.fromJson(e as Map<String, dynamic>)).toList(),
        skipped: (j['skipped'] as num?)?.toInt() ?? 0,
        truncated: j['truncated'] == true,
      );
}

class HomeSection {
  final String key, label;
  final String? icon, error;
  final bool hasMore;
  final List<NfRecord> items;
  const HomeSection({required this.key, required this.label, this.icon, this.error, this.hasMore = false, this.items = const []});
  factory HomeSection.fromJson(Map<String, dynamic> j) => HomeSection(
        key: j['key'] as String,
        label: j['label'] as String,
        icon: j['icon'] as String?,
        error: j['error'] as String?,
        hasMore: j['hasMore'] == true,
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
          for (final e in ((j['related'] as Map<String, dynamic>?) ?? const <String, dynamic>{}).entries)
            e.key: RelatedInfo.fromJson(e.value as Map<String, dynamic>),
        },
      );

  List<RelatedInfo> relatedFor(NfRecord r) => [for (final id in r.relatedIds) if (related[id] != null) related[id]!];
}
