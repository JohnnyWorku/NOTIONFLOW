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
const _months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/// One record, drawn with the card design that suits its table: task, project, goal, learning, habit (log) or standard.
class RecordCard extends StatelessWidget {
  final NfRecord r;
  final Widget? leading;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final bool flat;
  final CardStyle style;
  final List<RelatedInfo> related;
  const RecordCard(this.r, {super.key, this.leading, this.onTap, this.onLongPress, this.flat = false, this.style = CardStyle.standard, this.related = const []});

  bool get _done => r.done == true || (r.status != null && RegExp('done|complete', caseSensitive: false).hasMatch(r.status!));
  DueInfo? get _due => r.due == null ? null : formatDue(r.due!, done: _done);

  @override
  Widget build(BuildContext context) {
    switch (style) {
      case CardStyle.task: return _task(context);
      case CardStyle.project: return _project(context);
      case CardStyle.goal: return _goal(context);
      case CardStyle.learning: return _learning(context);
      case CardStyle.habit: return _habit(context);
      case CardStyle.standard: return _standard(context);
    }
  }

  // ---- shared pieces ----
  Widget _title(BuildContext context, {double? size, FontWeight weight = FontWeight.w600}) {
    final cs = Theme.of(context).colorScheme;
    return Text(
      r.title,
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
      style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontSize: size,
            fontWeight: weight,
            decoration: _done ? TextDecoration.lineThrough : null,
            color: _done ? cs.outline : null,
          ),
    );
  }

  Widget _open(BuildContext context) => IconButton(
        tooltip: 'Open in Notion',
        visualDensity: VisualDensity.compact,
        icon: Icon(Icons.open_in_new, size: 18, color: Theme.of(context).colorScheme.outline),
        onPressed: () => launchUrl(Uri.parse(r.url), mode: LaunchMode.externalApplication),
      );

  Widget _related(BuildContext context) {
    if (related.isEmpty) return const SizedBox.shrink();
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Wrap(spacing: 6, runSpacing: 6, children: [
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
    );
  }

  Widget _bar(BuildContext context, {double height = 6, Color? color}) {
    final cs = Theme.of(context).colorScheme;
    return Row(children: [
      Expanded(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: LinearProgressIndicator(value: (r.progress! / 100).clamp(0.0, 1.0), minHeight: height, color: color, backgroundColor: cs.surfaceContainerHighest),
        ),
      ),
      const SizedBox(width: 8),
      Text('${r.progress!.round()}%', style: Theme.of(context).textTheme.labelSmall),
    ]);
  }

  Widget _iconTile(IconData icon, {required Color bg, required Color fg, Gradient? gradient, double size = 42}) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(color: gradient == null ? bg : null, gradient: gradient, borderRadius: BorderRadius.circular(size / 3.2)),
        child: Icon(icon, size: size * 0.46, color: fg),
      );

  bool _dark(BuildContext c) => Theme.of(c).brightness == Brightness.dark;

  // ---- task: colour stripe by urgency, due date first ----
  Widget _task(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final due = _due;
    final pt = priorityTone(r.priority);
    final stripe = _done
        ? const Color(0xFF34D399)
        : (due?.overdue ?? false) || pt == Tone.red
            ? const Color(0xFFF43F5E)
            : pt == Tone.amber
                ? const Color(0xFFFBBF24)
                : cs.outlineVariant;
    return AppCard(
      color: flat ? cs.surfaceContainerLow : null,
      padding: EdgeInsets.zero,
      onTap: onTap,
      onLongPress: onLongPress,
      child: IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(width: 5, color: stripe),
          Expanded(
            child: Padding(
              padding: EdgeInsets.fromLTRB(leading != null ? 4 : 12, 11, 4, 11),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (leading != null) leading!,
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _title(context),
                    const SizedBox(height: 8),
                    Wrap(spacing: 6, runSpacing: 6, children: [
                      if (due != null) Pill(due.label, tone: due.overdue ? Tone.red : (due.today ? Tone.amber : Tone.slate), icon: Icons.event_outlined),
                      if (r.priority != null) Pill(r.priority!, tone: pt),
                      if (r.status != null) Pill(r.status!, tone: statusTone(r.status)),
                    ]),
                    _related(context),
                  ]),
                ),
                _open(context),
              ]),
            ),
          ),
        ]),
      ),
    );
  }

  // ---- project: gradient badge, big title, deadline and a thick progress bar ----
  Widget _project(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final due = _due;
    return AppCard(
      color: flat ? cs.surfaceContainerLow : null,
      padding: const EdgeInsets.fromLTRB(14, 14, 4, 14),
      onTap: onTap,
      onLongPress: onLongPress,
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (leading != null) leading!,
        _iconTile(Icons.folder_special_outlined, bg: cs.primaryContainer, fg: Colors.white, gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF8B5CF6), Color(0xFF4F46E5)])),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: _title(context, size: 15.5, weight: FontWeight.w700)),
              if (r.status != null) ...[const SizedBox(width: 8), Pill(r.status!, tone: statusTone(r.status))],
            ]),
            if (due != null) ...[
              const SizedBox(height: 4),
              Text('Deadline ${due.label}', style: TextStyle(fontSize: 12, fontWeight: due.overdue ? FontWeight.w700 : FontWeight.w400, color: due.overdue ? const Color(0xFFE11D48) : cs.onSurfaceVariant)),
            ],
            if (r.progress != null) ...[const SizedBox(height: 12), _bar(context, height: 9)],
            _related(context),
          ]),
        ),
        _open(context),
      ]),
    );
  }

  // ---- goal: progress ring, green accent ----
  Widget _goal(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final due = _due;
    final dark = _dark(context);
    return AppCard(
      color: flat ? cs.surfaceContainerLow : (dark ? const Color(0xFF0F2A24) : const Color(0xFFF0FDF4)),
      padding: const EdgeInsets.fromLTRB(14, 14, 4, 14),
      onTap: onTap,
      onLongPress: onLongPress,
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        if (leading != null) leading!,
        SizedBox(
          width: 56,
          height: 56,
          child: r.progress != null
              ? Stack(alignment: Alignment.center, children: [
                  SizedBox.expand(child: CircularProgressIndicator(value: (r.progress! / 100).clamp(0.0, 1.0), strokeWidth: 6, strokeCap: StrokeCap.round, color: const Color(0xFF10B981), backgroundColor: dark ? const Color(0xFF134E4A) : const Color(0xFFD1FAE5))),
                  Text('${r.progress!.round()}%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: dark ? const Color(0xFFA7F3D0) : const Color(0xFF047857))),
                ])
              : _iconTile(Icons.flag_outlined, bg: dark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5), fg: const Color(0xFF059669), size: 56),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _title(context, weight: FontWeight.w700),
            const SizedBox(height: 8),
            Wrap(spacing: 6, runSpacing: 6, children: [
              if (r.status != null) Pill(r.status!, tone: statusTone(r.status)),
              if (due != null) Pill('Target ${due.label}', tone: due.overdue ? Tone.red : Tone.green, icon: Icons.flag_outlined),
            ]),
            _related(context),
          ]),
        ),
        _open(context),
      ]),
    );
  }

  // ---- learning: book tile, blue accent, progress ----
  Widget _learning(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final due = _due;
    final dark = _dark(context);
    return AppCard(
      color: flat ? cs.surfaceContainerLow : null,
      padding: const EdgeInsets.fromLTRB(12, 12, 4, 12),
      onTap: onTap,
      onLongPress: onLongPress,
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (leading != null) leading!,
        _iconTile(Icons.menu_book_rounded, bg: dark ? const Color(0xFF0C4A6E) : const Color(0xFFE0F2FE), fg: const Color(0xFF0284C7), size: 40),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _title(context),
            const SizedBox(height: 8),
            Wrap(spacing: 6, runSpacing: 6, children: [
              if (r.status != null) Pill(r.status!, tone: statusTone(r.status)),
              if (r.amount != null) Pill(_num(r.amount!), tone: Tone.blue, icon: Icons.hourglass_bottom),
              if (due != null) Pill(due.label, tone: due.overdue ? Tone.red : Tone.slate, icon: Icons.event_outlined),
            ]),
            if (r.progress != null) ...[const SizedBox(height: 10), _bar(context, color: const Color(0xFF0EA5E9))],
            _related(context),
          ]),
        ),
        _open(context),
      ]),
    );
  }

  // ---- habit / log: calendar-date tile, big number on the right ----
  Widget _habit(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final dark = _dark(context);
    final ymd = (r.due ?? r.lastEdited).substring(0, 10).split('-');
    final month = _months[int.parse(ymd[1]) - 1];
    final day = int.parse(ymd[2]);
    final fg = dark ? const Color(0xFF99F6E4) : const Color(0xFF0F766E);
    return AppCard(
      color: flat ? cs.surfaceContainerLow : null,
      padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
      onTap: onTap,
      onLongPress: onLongPress,
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(color: dark ? const Color(0xFF134E4A) : const Color(0xFFCCFBF1), borderRadius: BorderRadius.circular(14)),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(month, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: fg)),
            Text('$day', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, height: 1.1, color: fg)),
          ]),
        ),
        const SizedBox(width: 10),
        if (leading != null) leading!,
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _title(context),
            if (r.status != null) ...[const SizedBox(height: 6), Align(alignment: Alignment.centerLeft, child: Pill(r.status!, tone: statusTone(r.status)))],
            _related(context),
          ]),
        ),
        if (r.amount != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 6), child: Text(_num(r.amount!), style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: fg))),
        _open(context),
      ]),
    );
  }

  // ---- standard ----
  Widget _standard(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final due = _due;
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
            _title(context),
            if (pills.isNotEmpty) ...[const SizedBox(height: 8), Wrap(spacing: 6, runSpacing: 6, children: pills)],
            if (r.progress != null) ...[const SizedBox(height: 10), _bar(context)],
            _related(context),
          ]),
        ),
        _open(context),
      ]),
    );
  }
}
