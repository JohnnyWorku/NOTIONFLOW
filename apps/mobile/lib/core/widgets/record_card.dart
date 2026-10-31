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

/// One record, drawn with the card that belongs to its table: task, project, goal, learning, habit (log), note or standard.
class RecordCard extends StatelessWidget {
  final NfRecord r;
  final Widget? leading;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final bool flat; // kept for existing call sites
  final CardStyle style;
  final List<RelatedInfo> related;
  const RecordCard(this.r, {super.key, this.leading, this.onTap, this.onLongPress, this.flat = false, this.style = CardStyle.standard, this.related = const []});

  bool get _done => r.done == true || (r.status != null && RegExp('done|complete', caseSensitive: false).hasMatch(r.status!));
  DueInfo? get _due => r.due == null ? null : formatDue(r.due!, done: _done);
  bool _dark(BuildContext c) => Theme.of(c).brightness == Brightness.dark;

  @override
  Widget build(BuildContext context) {
    switch (style) {
      case CardStyle.task: return _task(context);
      case CardStyle.project: return _project(context);
      case CardStyle.goal: return _goal(context);
      case CardStyle.learning: return _learning(context);
      case CardStyle.habit: return _habit(context);
      case CardStyle.note: return _note(context);
      case CardStyle.standard: return _standard(context);
    }
  }

  // ---------------------------------------------------------------- shared pieces
  Widget _title(BuildContext context, {double? size, FontWeight weight = FontWeight.w700, int lines = 2, Color? color}) {
    final cs = Theme.of(context).colorScheme;
    return Text(
      r.title,
      maxLines: lines,
      overflow: TextOverflow.ellipsis,
      style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontSize: size,
            fontWeight: weight,
            decoration: _done ? TextDecoration.lineThrough : null,
            color: _done ? cs.outline : color,
          ),
    );
  }

  Widget _open(BuildContext context, {Color? color}) => IconButton(
        tooltip: 'Open in Notion',
        visualDensity: VisualDensity.compact,
        icon: Icon(Icons.open_in_new, size: 18, color: color ?? Theme.of(context).colorScheme.outline),
        onPressed: () => launchUrl(Uri.parse(r.url), mode: LaunchMode.externalApplication),
      );

  Widget _related(BuildContext context, Color accent) {
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
              decoration: BoxDecoration(color: cs.surface, borderRadius: BorderRadius.circular(8), border: Border.all(color: cs.outlineVariant)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.link, size: 12, color: accent),
                const SizedBox(width: 4),
                Flexible(child: Text(x.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.labelSmall)),
              ]),
            ),
          ),
      ]),
    );
  }

  Widget _bar(BuildContext context, {required Color fill, required Color track, double height = 6, bool showPercent = true}) {
    return Row(children: [
      Expanded(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: LinearProgressIndicator(value: (r.progress! / 100).clamp(0.0, 1.0), minHeight: height, color: fill, backgroundColor: track),
        ),
      ),
      if (showPercent) ...[const SizedBox(width: 8), Text('${r.progress!.round()}%', style: Theme.of(context).textTheme.labelSmall)],
    ]);
  }

  // ---------------------------------------------------------------- TASK: urgency stripe, checkbox, date badge on the right
  Widget _task(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final dark = _dark(context);
    final due = _due;
    final pt = priorityTone(r.priority);
    final overdue = due?.overdue ?? false;
    final stripe = _done
        ? const Color(0xFF34D399)
        : overdue || pt == Tone.red
            ? const Color(0xFFF43F5E)
            : pt == Tone.amber
                ? const Color(0xFFFBBF24)
                : const Color(0xFFA5B4FC);
    final (Color bg, Color fg, Color line) = _done
        ? (dark ? const Color(0xFF064E3B) : const Color(0xFFECFDF5), dark ? const Color(0xFFA7F3D0) : const Color(0xFF047857), dark ? const Color(0xFF065F46) : const Color(0xFFA7F3D0))
        : overdue
            ? (dark ? const Color(0xFF4C0519) : const Color(0xFFFFF1F2), dark ? const Color(0xFFFECDD3) : const Color(0xFFBE123C), dark ? const Color(0xFF881337) : const Color(0xFFFECDD3))
            : (due?.today ?? false)
                ? (dark ? const Color(0xFF451A03) : const Color(0xFFFFFBEB), dark ? const Color(0xFFFDE68A) : const Color(0xFF92400E), dark ? const Color(0xFF78350F) : const Color(0xFFFDE68A))
                : (dark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC), dark ? const Color(0xFFCBD5E1) : const Color(0xFF475569), dark ? const Color(0xFF334155) : const Color(0xFFE2E8F0));
    final ymd = r.due?.substring(0, 10).split('-');
    return AppCard(
      padding: EdgeInsets.zero,
      onTap: onTap,
      onLongPress: onLongPress,
      child: IntrinsicHeight(
        child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(width: 5, color: stripe),
          Expanded(
            child: Padding(
              padding: EdgeInsets.fromLTRB(leading != null ? 4 : 12, 11, 4, 11),
              child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
                if (leading != null) leading!,
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _title(context),
                    if (r.priority != null || r.status != null) ...[
                      const SizedBox(height: 8),
                      Wrap(spacing: 6, runSpacing: 6, children: [
                        if (r.priority != null) Pill(r.priority!, tone: pt),
                        if (r.status != null) Pill(r.status!, tone: statusTone(r.status)),
                      ]),
                    ],
                    _related(context, cs.primary),
                  ]),
                ),
                if (ymd != null)
                  Container(
                    width: 50,
                    margin: const EdgeInsets.only(left: 8),
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(12), border: Border.all(color: line)),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_done ? 'DONE' : overdue ? 'OVERDUE' : (due?.today ?? false) ? 'TODAY' : _months[int.parse(ymd[1]) - 1], style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, letterSpacing: 0.4, color: fg)),
                      Text('${int.parse(ymd[2])}', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, height: 1.15, color: fg)),
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

  // ---------------------------------------------------------------- PROJECT: gradient header, deadline, thick progress bar
  Widget _project(BuildContext context) {
    final dark = _dark(context);
    final cs = Theme.of(context).colorScheme;
    final due = _due;
    const white = Colors.white;
    return AppCard(
      padding: EdgeInsets.zero,
      borderColor: dark ? const Color(0xFF4C1D95) : const Color(0xFFEDE9FE),
      onTap: onTap,
      onLongPress: onLongPress,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Container(
          padding: EdgeInsets.fromLTRB(leading != null ? 6 : 14, 6, 2, 6),
          decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.centerLeft, end: Alignment.centerRight, colors: [Color(0xFF8B5CF6), Color(0xFF4F46E5)])),
          child: Row(children: [
            if (leading != null) leading!,
            const Icon(Icons.folder_special_outlined, color: white, size: 20),
            const SizedBox(width: 10),
            Expanded(child: _title(context, size: 15, color: white, lines: 1)),
            if (r.status != null)
              Container(
                margin: const EdgeInsets.only(left: 8),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: const Color.fromRGBO(255, 255, 255, 0.22), borderRadius: BorderRadius.circular(99)),
                child: Text(r.status!, style: const TextStyle(color: white, fontSize: 11.5, fontWeight: FontWeight.w600)),
              ),
            _open(context, color: const Color.fromRGBO(255, 255, 255, 0.85)),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(due != null ? 'Deadline ${due.label}' : 'No deadline', style: TextStyle(fontSize: 12, fontWeight: (due?.overdue ?? false) ? FontWeight.w700 : FontWeight.w400, color: (due?.overdue ?? false) ? const Color(0xFFE11D48) : cs.onSurfaceVariant)),
              if (r.progress != null) Text('${r.progress!.round()}%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: dark ? const Color(0xFFDDD6FE) : const Color(0xFF6D28D9))),
            ]),
            if (r.progress != null) ...[const SizedBox(height: 8), _bar(context, fill: const Color(0xFF7C3AED), track: dark ? const Color(0xFF4C1D95) : const Color(0xFFEDE9FE), height: 10, showPercent: false)],
            _related(context, const Color(0xFF7C3AED)),
          ]),
        ),
      ]),
    );
  }

  // ---------------------------------------------------------------- GOAL: progress ring on a soft green card
  Widget _goal(BuildContext context) {
    final dark = _dark(context);
    final due = _due;
    final fg = dark ? const Color(0xFFA7F3D0) : const Color(0xFF047857);
    return AppCard(
      color: dark ? const Color(0xFF0F2A24) : const Color(0xFFF0FDF4),
      borderColor: dark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5),
      padding: EdgeInsets.fromLTRB(leading != null ? 6 : 14, 14, 4, 14),
      onTap: onTap,
      onLongPress: onLongPress,
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        if (leading != null) leading!,
        SizedBox(
          width: 56,
          height: 56,
          child: r.progress != null
              ? Stack(alignment: Alignment.center, children: [
                  SizedBox.expand(child: CircularProgressIndicator(value: (r.progress! / 100).clamp(0.0, 1.0), strokeWidth: 6, strokeCap: StrokeCap.round, color: const Color(0xFF10B981), backgroundColor: dark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5))),
                  Text('${r.progress!.round()}%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: fg)),
                ])
              : Container(decoration: BoxDecoration(color: dark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5), shape: BoxShape.circle), child: Icon(Icons.flag_outlined, color: fg, size: 26)),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _title(context),
            const SizedBox(height: 8),
            Wrap(spacing: 6, runSpacing: 6, children: [
              if (r.status != null) Pill(r.status!, tone: statusTone(r.status)),
              if (due != null) Pill('Target ${due.label}', tone: due.overdue ? Tone.red : Tone.green, icon: Icons.flag_outlined),
            ]),
            _related(context, const Color(0xFF10B981)),
          ]),
        ),
        _open(context),
      ]),
    );
  }

  // ---------------------------------------------------------------- LEARNING: book cover tile, hours/pages, progress
  Widget _learning(BuildContext context) {
    final dark = _dark(context);
    final due = _due;
    return AppCard(
      borderColor: dark ? const Color(0xFF0C4A6E) : const Color(0xFFE0F2FE),
      padding: EdgeInsets.fromLTRB(leading != null ? 6 : 12, 12, 4, 12),
      onTap: onTap,
      onLongPress: onLongPress,
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (leading != null) leading!,
        Container(
          width: 52,
          height: 70,
          decoration: BoxDecoration(
            gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF38BDF8), Color(0xFF2563EB)]),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(Icons.menu_book_rounded, color: Colors.white, size: 26),
        ),
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
            if (r.progress != null) ...[const SizedBox(height: 10), _bar(context, fill: const Color(0xFF0EA5E9), track: dark ? const Color(0xFF0C4A6E) : const Color(0xFFE0F2FE))],
            _related(context, const Color(0xFF0EA5E9)),
          ]),
        ),
        _open(context),
      ]),
    );
  }

  // ---------------------------------------------------------------- HABIT / LOG: calendar tile, big number, tick
  Widget _habit(BuildContext context) {
    final dark = _dark(context);
    final ymd = (r.due ?? r.lastEdited).substring(0, 10).split('-');
    final fg = dark ? const Color(0xFF99F6E4) : const Color(0xFF0F766E);
    return AppCard(
      borderColor: dark ? const Color(0xFF134E4A) : const Color(0xFFCCFBF1),
      padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
      onTap: onTap,
      onLongPress: onLongPress,
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            gradient: const LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0xFF14B8A6), Color(0xFF059669)]),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(_months[int.parse(ymd[1]) - 1], style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, letterSpacing: 0.6, color: Color.fromRGBO(255, 255, 255, 0.9))),
            Text('${int.parse(ymd[2])}', style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800, height: 1.1, color: Colors.white)),
          ]),
        ),
        const SizedBox(width: 10),
        if (leading != null) leading!,
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _title(context),
            if (r.status != null) ...[const SizedBox(height: 6), Align(alignment: Alignment.centerLeft, child: Pill(r.status!, tone: statusTone(r.status)))],
            _related(context, fg),
          ]),
        ),
        if (r.amount != null) Padding(padding: const EdgeInsets.symmetric(horizontal: 6), child: Text(_num(r.amount!), style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: fg))),
        if (_done) Container(width: 24, height: 24, decoration: const BoxDecoration(color: Color(0xFFD1FAE5), shape: BoxShape.circle), child: const Icon(Icons.check, size: 15, color: Color(0xFF059669))),
        _open(context),
      ]),
    );
  }

  // ---------------------------------------------------------------- NOTE: sticky note with a text preview
  Widget _note(BuildContext context) {
    final dark = _dark(context);
    final cs = Theme.of(context).colorScheme;
    final ymd = (r.due ?? r.lastEdited).substring(0, 10);
    return AppCard(
      color: dark ? const Color(0xFF422006) : const Color(0xFFFFFBEB),
      borderColor: dark ? const Color(0xFF78350F) : const Color(0xFFFDE68A),
      padding: EdgeInsets.fromLTRB(leading != null ? 6 : 14, 12, 4, 12),
      onTap: onTap,
      onLongPress: onLongPress,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (leading != null) leading!,
          const Padding(padding: EdgeInsets.only(top: 2), child: Icon(Icons.sticky_note_2_outlined, size: 18, color: Color(0xFFF59E0B))),
          const SizedBox(width: 8),
          Expanded(child: _title(context)),
          _open(context),
        ]),
        if (r.notes != null && r.notes!.trim().isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(0, 6, 10, 0),
            child: Text(r.notes!, maxLines: 3, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
          ),
        Padding(
          padding: const EdgeInsets.only(top: 10, right: 10),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(shortDate(ymd), style: TextStyle(fontSize: 12, color: dark ? const Color(0xFFFDE68A) : const Color(0xFFB45309))),
            if (r.status != null) Pill(r.status!, tone: statusTone(r.status)),
          ]),
        ),
        _related(context, const Color(0xFFF59E0B)),
      ]),
    );
  }

  // ---------------------------------------------------------------- STANDARD: clean and simple
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
      onTap: onTap,
      onLongPress: onLongPress,
      padding: EdgeInsets.fromLTRB(leading != null ? 6 : 14, 12, 4, 12),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (leading != null) leading!,
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            _title(context),
            if (pills.isNotEmpty) ...[const SizedBox(height: 8), Wrap(spacing: 6, runSpacing: 6, children: pills)],
            if (r.progress != null) ...[const SizedBox(height: 10), _bar(context, fill: cs.primary, track: cs.surfaceContainerHighest)],
            _related(context, cs.primary),
          ]),
        ),
        _open(context),
      ]),
    );
  }
}
