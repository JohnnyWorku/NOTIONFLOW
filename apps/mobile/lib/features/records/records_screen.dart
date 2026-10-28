import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/network/api_exception.dart';
import '../../core/widgets/app_card.dart';
import '../../core/widgets/record_card.dart';
import '../../core/widgets/state_views.dart';
import '../tasks/record.dart';
import '../tasks/records_repository.dart';
import 'record_form.dart';

/// One screen for Tasks, Projects, Goals, Learning and every custom table.
/// Tap = edit, long-press = delete, checkbox = mark done, + = create.
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
      showDragHandle: true,
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
    final meta = ref.watch(metaProvider(widget.kind)).valueOrNull;
    final showOverdue = meta != null && meta.has('due') && meta.has('done');

    return Scaffold(
      appBar: AppBar(
        title: Text(_label),
        automaticallyImplyLeading: Navigator.of(context).canPop(),
        actions: [
          if (ref.watch(pageOfProvider(widget.kind)).valueOrNull case final pg?)
            IconButton(tooltip: '${pg.title} page', icon: const Icon(Icons.description_outlined), onPressed: () => context.go('/collections/page/${pg.id}')),
        ],
      ),
      floatingActionButton: FloatingActionButton(onPressed: () => _openForm(), tooltip: 'New', child: const Icon(Icons.add)),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
          child: Row(children: [
            Expanded(
              child: TextField(
                decoration: fieldDecoration(context, hint: 'Search ${_label.toLowerCase()}', icon: Icons.search),
                textInputAction: TextInputAction.search,
                onSubmitted: (v) { _search = v.trim(); _load(); },
              ),
            ),
            if (showOverdue) ...[
              const SizedBox(width: 8),
              FilterChip(label: const Text('Overdue'), selected: _overdue, onSelected: (v) { _overdue = v; _load(); }),
            ],
          ]),
        ),
        Expanded(
          child: _loading
              ? const Padding(padding: EdgeInsets.all(16), child: SkeletonList(count: 5))
              : _error != null
                  ? ErrorView(error: _error!, onRetry: _load)
                  : RefreshIndicator(
                      onRefresh: () => _load(silent: true),
                      child: _items.isEmpty
                          ? ListView(children: [SizedBox(height: 260, child: EmptyView('No ${_label.toLowerCase()} found.'))])
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
                              itemCount: _items.length + (_cursor != null ? 1 : 0),
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (_, i) {
                                if (i == _items.length) {
                                  return Center(
                                    child: _loadingMore
                                        ? const Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator())
                                        : OutlinedButton(onPressed: _loadMore, child: const Text('Load more')),
                                  );
                                }
                                final r = _items[i];
                                return RecordCard(
                                  r,
                                  style: meta?.style ?? CardStyle.standard,
                                  onTap: () => _openForm(r),
                                  onLongPress: () => _confirmDelete(r),
                                  leading: r.done == null
                                      ? null
                                      : Checkbox(value: r.done, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)), onChanged: (_) => _toggle(r)),
                                );
                              },
                            ),
                    ),
        ),
      ]),
    );
  }
}
