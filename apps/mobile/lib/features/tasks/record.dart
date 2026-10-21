/// Plain Dart model (no code generation) mirroring the backend NfRecord contract.
class NfRecord {
  final String id, url, title, lastEdited;
  final String? status, priority, due, notes;
  final bool? done;
  final double? progress;

  const NfRecord({
    required this.id, required this.url, required this.title, required this.lastEdited,
    this.status, this.priority, this.due, this.notes, this.done, this.progress,
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
      );

  String get subtitle => [
        status, priority,
        if (due != null) 'due ${due!.substring(0, 10)}',
        if (progress != null) '${progress!.round()}%',
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
