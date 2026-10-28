// Plain Dart models (no code generation) mirroring the backend contract.

/// Which card design a table gets (decided by the server from the table's name and properties).
enum CardStyle { task, project, goal, learning, habit, standard }

CardStyle cardStyleFrom(String? s) => CardStyle.values.firstWhere((e) => e.name == s, orElse: () => CardStyle.standard);

class NfRecord {
  final String id, url, title, lastEdited;
  final String? status, priority, due, notes;
  final bool? done;
  final double? progress, amount;
  final List<String> relatedIds;

  const NfRecord({
    required this.id, required this.url, required this.title, required this.lastEdited,
    this.status, this.priority, this.due, this.notes, this.done, this.progress, this.amount,
    this.relatedIds = const [],
  });

  factory NfRecord.fromJson(Map<String, dynamic> j) => NfRecord(
        id: j['id'] as String,
        url: (j['url'] ?? '') as String,
        title: (j['title'] ?? 'Untitled') as String,
        lastEdited: j['lastEdited'] as String,
        status: j['status'] as String?,
        priority: j['priority'] as String?,
        due: j['due'] as String?,
        notes: j['notes'] as String?,
        done: j['done'] as bool?,
        progress: (j['progress'] as num?)?.toDouble(),
        amount: (j['amount'] as num?)?.toDouble(),
        relatedIds: ((j['relatedIds'] as List?) ?? const []).cast<String>(),
      );

  static String _num(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();

  String get subtitle => [
        status, priority,
        if (due != null) 'due ${due!.substring(0, 10)}',
        if (progress != null) '${progress!.round()}%',
        if (amount != null) _num(amount!),
      ].whereType<String>().join(' · ');
}

class RecordPage {
  final List<NfRecord> items;
  final String? nextCursor;
  const RecordPage(this.items, this.nextCursor);
  factory RecordPage.fromJson(Map<String, dynamic> j) => RecordPage(
        (j['items'] as List).map((e) => NfRecord.fromJson(e as Map<String, dynamic>)).toList(),
        j['nextCursor'] as String?,
      );
}

class CollectionInfo {
  final String key, label;
  final String? icon;
  final bool builtin, configured;
  const CollectionInfo({required this.key, required this.label, this.icon, required this.builtin, required this.configured});
  factory CollectionInfo.fromJson(Map<String, dynamic> j) => CollectionInfo(
        key: j['key'] as String,
        label: j['label'] as String,
        icon: j['icon'] as String?,
        builtin: j['builtin'] == true,
        configured: j['configured'] == true,
      );
}

/// Which Notion properties a collection maps to, plus the allowed Status/Priority options.
class CollectionMeta {
  final Map<String, String> fields;
  final List<String> statuses, priorities;
  final CardStyle style;
  const CollectionMeta({required this.fields, required this.statuses, required this.priorities, this.style = CardStyle.standard});
  bool has(String k) => fields.containsKey(k);
  factory CollectionMeta.fromJson(Map<String, dynamic> j) {
    // Tolerant of any Map type (e.g. an empty literal is Map<dynamic, dynamic>).
    final opts = ((j['options'] as Map?) ?? const {}).cast<String, dynamic>();
    final rawFields = ((j['fields'] as Map?) ?? const {}).cast<String, dynamic>();
    return CollectionMeta(
      fields: {
        for (final e in rawFields.entries)
          if (e.value is String) e.key: e.value as String,
      },
      statuses: ((opts['status'] as List?) ?? const []).cast<String>(),
      priorities: ((opts['priority'] as List?) ?? const []).cast<String>(),
      style: cardStyleFrom(j['style'] as String?),
    );
  }
}

/// A record linked through a Notion relation (possibly in another table).
class RelatedInfo {
  final String id, title, url;
  final String? status, collectionKey;
  const RelatedInfo({required this.id, required this.title, required this.url, this.status, this.collectionKey});
  factory RelatedInfo.fromJson(Map<String, dynamic> j) => RelatedInfo(
        id: j['id'] as String,
        title: (j['title'] ?? 'Untitled') as String,
        url: (j['url'] ?? '') as String,
        status: j['status'] as String?,
        collectionKey: j['collectionKey'] as String?,
      );
}

/// A Notion page shown as its own screen (linked from the home page, pinned, or the page a table lives on).
class PageRef {
  final String id, title;
  final String? icon, iconName;
  const PageRef({required this.id, required this.title, this.icon, this.iconName});
  factory PageRef.fromJson(Map<String, dynamic> j) => PageRef(
        id: j['id'] as String,
        title: (j['title'] ?? 'Page') as String,
        icon: j['icon'] as String?,
        iconName: j['iconName'] as String?,
      );
}
