import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../core/network/api_client.dart';
import '../../core/widgets/state_views.dart';
import '../records/records_screen.dart';
import 'record.dart';
import 'records_repository.dart';

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});
  @override
  ConsumerState<TasksScreen> createState() => _TasksState();
}

class _TasksState extends ConsumerState<TasksScreen> {
  String search = '';
  bool overdue = false;

  void _toast(String m) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  Future<void> _toggle(NfRecord r) async {
    try {
      await ref.read(recordsRepoProvider).update('tasks', r, {'done': !(r.done ?? false)});
      ref.invalidate(recordsProvider);
    } on ApiException catch (e) {
      if (e.isConflict) {
        _toast('Changed in Notion meanwhile. Refreshed; please retry.');
        ref.invalidate(recordsProvider);
      } else {
        _toast(e.message);
      }
    }
  }

  Future<void> _create() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _NewTaskSheet(),
    );
    if (created == true) ref.invalidate(recordsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(recordsProvider((kind: 'tasks', search: search, overdue: overdue)));
    return Scaffold(
      appBar: AppBar(title: const Text('Tasks'), actions: [
        FilterChip(label: const Text('Overdue'), selected: overdue, onSelected: (v) => setState(() => overdue = v)),
        const SizedBox(width: 8),
      ]),
      floatingActionButton: FloatingActionButton(onPressed: _create, tooltip: 'New task', child: const Icon(Icons.add)),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search tasks', border: OutlineInputBorder()),
            onSubmitted: (v) => setState(() => search = v.trim()),
          ),
        ),
        Expanded(
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => ErrorView(error: e, onRetry: () => ref.invalidate(recordsProvider)),
            data: (page) => RefreshIndicator(
              onRefresh: () async => ref.invalidate(recordsProvider),
              child: page.items.isEmpty
                  ? ListView(children: const [SizedBox(height: 200, child: EmptyView('No tasks found.'))])
                  : ListView.builder(
                      itemCount: page.items.length,
                      itemBuilder: (_, i) {
                        final r = page.items[i];
                        return RecordTile(r,
                            trailing: r.done == null ? null : Checkbox(value: r.done, onChanged: (_) => _toggle(r)));
                      }),
            ),
          ),
        ),
      ]),
    );
  }
}

class _NewTaskSheet extends ConsumerStatefulWidget {
  const _NewTaskSheet();
  @override
  ConsumerState<_NewTaskSheet> createState() => _NewTaskSheetState();
}

class _NewTaskSheetState extends ConsumerState<_NewTaskSheet> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _priority = TextEditingController();
  DateTime? _due;
  bool _busy = false;
  String? _error;
  // Same key across retries of this submission => backend never creates a second page.
  final String _idem = const Uuid().v4();

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _busy = true; _error = null; });
    try {
      await ref.read(recordsRepoProvider).create('tasks', {
        'title': _title.text.trim(),
        if (_priority.text.trim().isNotEmpty) 'priority': _priority.text.trim(),
        if (_due != null) 'due': _due!.toIso8601String().substring(0, 10),
      }, _idem);
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      setState(() { _error = e.message; _busy = false; });
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
        child: Form(
          key: _form,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextFormField(
              controller: _title,
              decoration: const InputDecoration(labelText: 'Title'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Title is required' : null,
            ),
            TextFormField(controller: _priority, decoration: const InputDecoration(labelText: 'Priority (optional)')),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(_due == null ? 'No due date' : 'Due ${_due!.toIso8601String().substring(0, 10)}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final d = await showDatePicker(context: context, firstDate: DateTime(2020), lastDate: DateTime(2100), initialDate: DateTime.now());
                if (d != null) setState(() => _due = d);
              },
            ),
            if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            const SizedBox(height: 8),
            FilledButton(onPressed: _busy ? null : _submit, child: Text(_busy ? 'Creating…' : 'Create task')),
          ]),
        ),
      );
}
