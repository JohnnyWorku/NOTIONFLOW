import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/network/api_exception.dart';
import '../../core/widgets/state_views.dart';
import '../tasks/record.dart';
import '../tasks/records_repository.dart';
import 'record_form.dart';

class RecordTile extends StatelessWidget {
  final NfRecord r;
  final Widget? trailing;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  const RecordTile(this.r, {super.key, this.trailing, this.onTap, this.onLongPress});

  @override
  Widget build(BuildContext context) {
    final done = r.done == true;
    return ListTile(
      onTap: onTap,
      onLongPress: onLongPress,
      title: Text(r.title, style: done ? const TextStyle(decoration: TextDecoration.lineThrough) : null),
      subtitle: r.subtitle.isEmpty ? null : Text(r.subtitle),
      trailing: trailing ??
          IconButton(
            tooltip: 'Open in Notion',
            icon: const Icon(Icons.open_in_new),
            onPressed: () => launchUrl(Uri.parse(r.url), mode: LaunchMode.externalApplication),
          ),
    );
  }
}

/// One screen for Tasks, Projects, Goals, Learning and every custom table.
/// Tap = edit, long-press = delete, checkbox = mark done, FAB = create.
class RecordsScreen extends ConsumerStatefulWidget {
  final String kind;
  const RecordsScreen({super.key, required this.kind});
  @override
  ConsumerState<RecordsScreen> createState() => _RecordsState();
}

class _RecordsState extends ConsumerState<RecordsScreen> {
  final _items = <NfRecord>[];
  String? _cursor;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;
  String _search = '';
  bool _overdue = false;
  int _gen = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String get _label {
    final cols = ref.read(collectionsProvider).valueOrNull;
    final hit = cols?.where((c) => c.key == widget.kind);
    return (hit != null && hit.isNotEmpty) ? hit.first.label : widget.kind[0].toUpperCase() + widget.kind.substring(1);
  }

  Future<void> _load({bool silent = false}) async {
    final gen = ++_gen;
    if (!silent) setState(() { _loading = true; _error = null; });
    try {
      final page = await ref.read(recordsRepoProvider).list(widget.kind, search: _search, overdue: _overdue);
      if (!mounted || gen != _gen) return;
      setState(() {
        _items..clear()..addAll(page.items);
        _cursor = page.nextCursor;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (!mounted || gen != _gen) return;
      if (!silent) setState(() { _error = e; _loading = false; });
    }
  }

  Future<void> _loadMore() async {
    if (_cursor == null || _loadingMore) return;
    setState(() => _loadingMore = true);
    try {
      final page = await ref.read(recordsRepoProvider).list(widget.kind, search: _search, overdue: _overdue, cursor: _cursor);
      if (!mounted) return;
      setState(() { _items.addAll(page.items); _cursor = page.nextCursor; _loadingMore = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingMore = false);
      _toast(e.toString());
    }
  }

  void _toast(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _openForm([NfRecord? existing]) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => RecordFormSheet(kind: widget.kind, label: _label, existing: existing),
    );
    if (changed == true) _load(silent: true);
  }

  Future<void> _toggle(NfRecord r) async {
    try {
      await ref.read(recordsRepoProvider).update(widget.kind, r, {'done': !(r.done ?? false)});
      _load(silent: true);
    } on ApiException catch (e) {
      if (e.isConflict) {
        _toast('Changed in Notion meanwhile. Refreshed; please retry.');
        _load(silent: true);
      } else {
        _toast(e.message);
      }
    }
  }

  Future<void> _confirmDelete(NfRecord r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete?'),
        content: Text('“${r.title}” will be moved to the Notion trash. You can restore it from Notion.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(recordsRepoProvider).delete(widget.kind, r);
      _load(silent: true);
    } on ApiException catch (e) {
      _toast(e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Refetch quietly when the server's sync version changes (Notion edit, webhook, other device).
    ref.listen<int?>(syncVersionProvider, (prev, next) {
      if (prev != null && next != null && prev != next) _load(silent: true);
    });
    final metaAsync = ref.watch(metaProvider(widget.kind));
    final showOverdue = metaAsync.valueOrNull?.has('due') == true && metaAsync.valueOrNull?.has('done') == true;
    final canPop = Navigator.of(context).canPop();

    return Scaffold(
      appBar: AppBar(
        title: Text(_label),
        automaticallyImplyLeading: canPop,
        actions: [
          if (showOverdue)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(label: const Text('Overdue'), selected: _overdue, onSelected: (v) { _overdue = v; _load(); }),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(onPressed: () => _openForm(), tooltip: 'New', child: const Icon(Icons.add)),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search', border: OutlineInputBorder()),
            textInputAction: TextInputAction.search,
            onSubmitted: (v) { _search = v.trim(); _load(); },
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? ErrorView(error: _error!, onRetry: _load)
                  : RefreshIndicator(
                      onRefresh: () => _load(silent: true),
                      child: _items.isEmpty
                          ? ListView(children: [SizedBox(height: 200, child: EmptyView('No ${_label.toLowerCase()} found.'))])
                          : ListView.builder(
                              itemCount: _items.length + (_cursor != null ? 1 : 0),
                              itemBuilder: (_, i) {
                                if (i == _items.length) {
                                  return Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Center(
                                      child: _loadingMore
                                          ? const CircularProgressIndicator()
                                          : OutlinedButton(onPressed: _loadMore, child: const Text('Load more')),
                                    ),
                                  );
                                }
                                final r = _items[i];
                                return RecordTile(
                                  r,
                                  onTap: () => _openForm(r),
                                  onLongPress: () => _confirmDelete(r),
                                  trailing: r.done == null ? null : Checkbox(value: r.done, onChanged: (_) => _toggle(r)),
                                );
                              },
                            ),
                    ),
        ),
      ]),
    );
  }
}
