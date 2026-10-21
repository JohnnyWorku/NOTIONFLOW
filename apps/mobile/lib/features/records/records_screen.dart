import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/widgets/state_views.dart';
import '../tasks/record.dart';
import '../tasks/records_repository.dart';

class RecordTile extends StatelessWidget {
  final NfRecord r;
  final Widget? trailing;
  const RecordTile(this.r, {super.key, this.trailing});
  @override
  Widget build(BuildContext context) => ListTile(
        title: Text(r.title),
        subtitle: Text(r.subtitle),
        trailing: trailing ??
            IconButton(
              tooltip: 'Open in Notion',
              icon: const Icon(Icons.open_in_new),
              onPressed: () => launchUrl(Uri.parse(r.url), mode: LaunchMode.externalApplication),
            ),
      );
}

class RecordsScreen extends ConsumerStatefulWidget {
  final String kind, title;
  const RecordsScreen({super.key, required this.kind, required this.title});
  @override
  ConsumerState<RecordsScreen> createState() => _State();
}

class _State extends ConsumerState<RecordsScreen> {
  String search = '';
  @override
  Widget build(BuildContext context) {
    final async = ref.watch(recordsProvider((kind: widget.kind, search: search, overdue: false)));
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search', border: OutlineInputBorder()),
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
                  ? ListView(children: [SizedBox(height: 200, child: EmptyView('No ${widget.title.toLowerCase()} found.'))])
                  : ListView.builder(itemCount: page.items.length, itemBuilder: (_, i) => RecordTile(page.items[i])),
            ),
          ),
        ),
      ]),
    );
  }
}
