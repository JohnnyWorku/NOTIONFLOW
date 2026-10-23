import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../features/tasks/record.dart';
import '../format.dart';
import 'app_card.dart';

/// Jump to the related record: its table inside the app if known, otherwise its Notion page.
void openRelated(BuildContext context, RelatedInfo r) {
  if (r.collectionKey != null) {
    context.go('/collections/${r.collectionKey}');
  } else {
    launchUrl(Uri.parse(r.url), mode: LaunchMode.externalApplication);
  }
}

String _num(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();

class RecordCard extends StatelessWidget {
  final NfRecord r;
  final Widget? leading;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final bool flat;
  final List<RelatedInfo> related;
  const RecordCard(this.r, {super.key, this.leading, this.onTap, this.onLongPress, this.flat = false, this.related = const []});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final done = r.done == true || (r.status != null && RegExp('done|complete', caseSensitive: false).hasMatch(r.status!));
    final due = r.due == null ? null : formatDue(r.due!, done: done);
    final pills = <Widget>[
      if (r.status != null) Pill(r.status!, tone: statusTone(r.status)),
      if (r.priority != null) Pill(r.priority!, tone: priorityTone(r.priority)),
      if (due != null) Pill(due.label, tone: due.overdue ? Tone.red : (due.today ? Tone.amber : Tone.slate), icon: Icons.event_outlined),
      if (r.amount != null) Pill(_num(r.amount!), tone: Tone.violet, icon: Icons.tag),
    ];
    return AppCard(
      color: flat ? cs.surfaceContainerLow : null,
      onTap: onTap,
      onLongPress: onLongPress,
      padding: EdgeInsets.fromLTRB(leading != null ? 6 : 14, 12, 4, 12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (leading != null) leading!,
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              r.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                    decoration: done ? TextDecoration.lineThrough : null,
                    color: done ? cs.outline : null,
                  ),
            ),
            if (pills.isNotEmpty) ...[const SizedBox(height: 8), Wrap(spacing: 6, runSpacing: 6, children: pills)],
            if (r.progress != null) ...[
              const SizedBox(height: 10),
              Row(children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(value: (r.progress! / 100).clamp(0.0, 1.0), minHeight: 6, backgroundColor: cs.surfaceContainerHighest),
                  ),
                ),
                const SizedBox(width: 8),
                Text('${r.progress!.round()}%', style: Theme.of(context).textTheme.labelSmall),
              ]),
            ],
            if (related.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(spacing: 6, runSpacing: 6, children: [
                for (final x in related.take(4))
                  InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () => openRelated(context, x),
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 170),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(8)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.link, size: 12, color: cs.primary),
                        const SizedBox(width: 4),
                        Flexible(child: Text(x.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.labelSmall)),
                      ]),
                    ),
                  ),
              ]),
            ],
          ]),
        ),
        IconButton(
          tooltip: 'Open in Notion',
          visualDensity: VisualDensity.compact,
          icon: Icon(Icons.open_in_new, size: 18, color: cs.outline),
          onPressed: () => launchUrl(Uri.parse(r.url), mode: LaunchMode.externalApplication),
        ),
      ]),
    );
  }
}
