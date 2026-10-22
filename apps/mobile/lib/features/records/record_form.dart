import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../core/network/api_exception.dart';
import '../tasks/record.dart';
import '../tasks/records_repository.dart';

/// Create (existing == null) or edit a record. Pops `true` when something changed on the server.
class RecordFormSheet extends ConsumerStatefulWidget {
  final String kind;
  final String label;
  final NfRecord? existing;
  const RecordFormSheet({super.key, required this.kind, required this.label, this.existing});
  @override
  ConsumerState<RecordFormSheet> createState() => _FormState();
}

class _FormState extends ConsumerState<RecordFormSheet> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _title;
  late final TextEditingController _progress;
  late final TextEditingController _amount;
  late final TextEditingController _notes;
  String? _status;
  String? _priority;
  DateTime? _due;
  bool _done = false;
  bool _busy = false;
  bool _conflict = false;
  String? _error;
  // Same key across retries of this submission => backend never creates a second page.
  final String _idem = const Uuid().v4();

  @override
  void initState() {
    super.initState();
    final r = widget.existing;
    _title = TextEditingController(text: r?.title ?? '');
    _progress = TextEditingController(text: r?.progress == null ? '' : r!.progress!.round().toString());
    _amount = TextEditingController(text: r?.amount == null ? '' : _fmt(r!.amount!));
    _notes = TextEditingController(text: r?.notes ?? '');
    _status = r?.status;
    _priority = r?.priority;
    _due = r?.due == null ? null : DateTime.tryParse(r!.due!.substring(0, 10));
    _done = r?.done ?? false;
  }

  static String _fmt(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();
  static String _ymd(DateTime d) => d.toIso8601String().substring(0, 10);

  @override
  void dispose() {
    _title.dispose();
    _progress.dispose();
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _save(CollectionMeta meta) async {
    if (!_form.currentState!.validate()) return;
    setState(() { _busy = true; _error = null; });
    final repo = ref.read(recordsRepoProvider);
    try {
      final r = widget.existing;
      if (r == null) {
        await repo.create(widget.kind, {
          'title': _title.text.trim(),
          if (meta.has('status') && _status != null) 'status': _status,
          if (meta.has('priority') && _priority != null) 'priority': _priority,
          if (meta.has('due') && _due != null) 'due': _ymd(_due!),
          if (meta.has('done')) 'done': _done,
          if (meta.has('progress') && _progress.text.trim().isNotEmpty) 'progress': double.parse(_progress.text.trim()),
          if (meta.has('amount') && _amount.text.trim().isNotEmpty) 'amount': double.parse(_amount.text.trim()),
          if (meta.has('notes') && _notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
        }, _idem);
      } else {
        final changes = <String, dynamic>{};
        if (_title.text.trim() != r.title) changes['title'] = _title.text.trim();
        if (meta.has('status') && _status != null && _status != r.status) changes['status'] = _status;
        if (meta.has('priority') && _priority != null && _priority != r.priority) changes['priority'] = _priority;
        final oldDue = r.due?.substring(0, 10);
        final newDue = _due == null ? null : _ymd(_due!);
        if (meta.has('due') && newDue != oldDue) changes['due'] = newDue;
        if (meta.has('done') && _done != (r.done ?? false)) changes['done'] = _done;
        final p = _progress.text.trim();
        if (meta.has('progress') && p.isNotEmpty && double.parse(p) != r.progress) changes['progress'] = double.parse(p);
        final a = _amount.text.trim();
        if (meta.has('amount') && a.isNotEmpty && double.parse(a) != r.amount) changes['amount'] = double.parse(a);
        if (meta.has('notes') && _notes.text != (r.notes ?? '')) changes['notes'] = _notes.text;
        if (changes.isEmpty) {
          if (mounted) Navigator.pop(context, false);
          return;
        }
        await repo.update(widget.kind, r, changes);
      }
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _conflict = e.isConflict;
        _error = e.isConflict ? 'This record changed in Notion. Close this form to load the latest version, then edit again.' : e.message;
      });
    }
  }

  Widget _choice(String label, String? value, List<String> options, ValueChanged<String?> onChanged) {
    final opts = value != null && !options.contains(value) ? [value, ...options] : options;
    return InputDecorator(
      decoration: InputDecoration(labelText: label, border: const OutlineInputBorder(), contentPadding: const EdgeInsets.symmetric(horizontal: 12)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isExpanded: true,
          value: value,
          hint: const Text('—'),
          items: [for (final o in opts) DropdownMenuItem(value: o, child: Text(o))],
          onChanged: _busy ? null : onChanged,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final metaAsync = ref.watch(metaProvider(widget.kind));
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: EdgeInsets.fromLTRB(16, 16, 16, 16 + MediaQuery.of(context).viewInsets.bottom),
      child: metaAsync.when(
        loading: () => const SizedBox(height: 160, child: Center(child: CircularProgressIndicator())),
        error: (e, _) => SizedBox(height: 160, child: Center(child: Text(e.toString()))),
        data: (meta) => SingleChildScrollView(
          child: Form(
            key: _form,
            child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Text(widget.existing == null ? 'New ${widget.label}' : 'Edit', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextFormField(
                controller: _title,
                autofocus: widget.existing == null,
                decoration: const InputDecoration(labelText: 'Title', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Title is required' : null,
              ),
              if (meta.has('status')) ...[
                const SizedBox(height: 12),
                _choice('Status', _status, meta.statuses, (v) => setState(() => _status = v)),
              ],
              if (meta.has('priority')) ...[
                const SizedBox(height: 12),
                _choice('Priority', _priority, meta.priorities, (v) => setState(() => _priority = v)),
              ],
              if (meta.has('due')) ...[
                const SizedBox(height: 12),
                InputDecorator(
                  decoration: const InputDecoration(labelText: 'Date', border: OutlineInputBorder()),
                  child: Row(children: [
                    Expanded(child: Text(_due == null ? 'Not set' : _ymd(_due!))),
                    if (_due != null) IconButton(tooltip: 'Clear date', icon: const Icon(Icons.clear), onPressed: () => setState(() => _due = null)),
                    IconButton(
                      tooltip: 'Pick date',
                      icon: const Icon(Icons.calendar_today),
                      onPressed: () async {
                        final d = await showDatePicker(context: context, firstDate: DateTime(2020), lastDate: DateTime(2100), initialDate: _due ?? DateTime.now());
                        if (d != null) setState(() => _due = d);
                      },
                    ),
                  ]),
                ),
              ],
              if (meta.has('progress')) ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: _progress,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Progress (0–100)', border: OutlineInputBorder()),
                  validator: (v) {
                    final t = (v ?? '').trim();
                    if (t.isEmpty) return null;
                    final n = double.tryParse(t);
                    return (n == null || n < 0 || n > 100) ? 'Enter a number from 0 to 100' : null;
                  },
                ),
              ],
              if (meta.has('amount')) ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: _amount,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                  decoration: InputDecoration(labelText: meta.fields['amount'] ?? 'Amount', border: const OutlineInputBorder()),
                  validator: (v) {
                    final t = (v ?? '').trim();
                    return t.isEmpty || double.tryParse(t) != null ? null : 'Enter a number';
                  },
                ),
              ],
              if (meta.has('done'))
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                  title: Text(meta.fields['done'] ?? 'Done'),
                  value: _done,
                  onChanged: _busy ? null : (v) => setState(() => _done = v ?? false),
                ),
              if (meta.has('notes')) ...[
                const SizedBox(height: 12),
                TextFormField(controller: _notes, maxLines: 3, decoration: const InputDecoration(labelText: 'Notes', border: OutlineInputBorder())),
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: TextStyle(color: cs.error)),
              ],
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: OutlinedButton(onPressed: _busy ? null : () => Navigator.pop(context, _conflict), child: Text(_conflict ? 'Close' : 'Cancel'))),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: (_busy || _conflict) ? null : () => _save(meta),
                    child: Text(_busy ? 'Saving…' : widget.existing == null ? 'Create' : 'Save'),
                  ),
                ),
              ]),
            ]),
          ),
        ),
      ),
    );
  }
}
