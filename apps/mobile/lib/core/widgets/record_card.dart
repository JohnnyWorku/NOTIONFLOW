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

/// Colours and icon of one table kind (the Goals look, a different accent per table).
class _Accent {
  final Color card, border, circle, fg, ring;
  final IconData icon;
  const _Accent(this.card, this.border, this.circle, this.fg, this.ring, this.icon);
}

_Accent _accent(CardStyle s, bool dark) {
  switch (s) {
    case CardStyle.task:
      return dark
          ? const _Accent(Color(0xFF1E1B4B), Color(0xFF312E81), Color(0xFF312E81), Color(0xFFC7D2FE), Color(0xFF818CF8), Icons.check_circle_outline)
          : const _Accent(Color(0xFFEEF2FF), Color(0xFFE0E7FF), Color(0xFFE0E7FF), Color(0xFF4F46E5), Color(0xFF6366F1), Icons.check_circle_outline);
    case CardStyle.project:
      return dark
          ? const _Accent(Color(0xFF2E1065), Color(0xFF4C1D95), Color(0xFF4C1D95), Color(0xFFDDD6FE), Color(0xFFA78BFA), Icons.folder_special_outlined)
          : const _Accent(Color(0xFFF5F3FF), Color(0xFFEDE9FE), Color(0xFFEDE9FE), Color(0xFF7C3AED), Color(0xFF8B5CF6), Icons.folder_special_outlined);
    case CardStyle.goal:
      return dark
          ? const _Accent(Color(0xFF0F2A24), Color(0xFF064E3B), Color(0xFF064E3B), Color(0xFFA7F3D0), Color(0xFF34D399), Icons.flag_outlined)
          : const _Accent(Color(0xFFF0FDF4), Color(0xFFD1FAE5), Color(0xFFD1FAE5), Color(0xFF059669), Color(0xFF10B981), Icons.flag_outlined);
    case CardStyle.learning:
      return dark
          ? const _Accent(Color(0xFF082F49), Color(0xFF0C4A6E), Color(0xFF0C4A6E), Color(0xFFBAE6FD), Color(0xFF38BDF8), Icons.menu_book_rounded)
          : const _Accent(Color(0xFFF0F9FF), Color(0xFFE0F2FE), Color(0xFFE0F2FE), Color(0xFF0284C7), Color(0xFF0EA5E9), Icons.menu_book_rounded);
    case CardStyle.habit:
      return dark
          ? const _Accent(Color(0xFF042F2E), Color(0xFF134E4A), Color(0xFF134E4A), Color(0xFF99F6E4), Color(0xFF2DD4BF), Icons.auto_awesome)
          : const _Accent(Color(0xFFF0FDFA), Color(0xFFCCFBF1), Color(0xFFCCFBF1), Color(0xFF0F766E), Color(0xFF14B8A6), Icons.auto_awesome);
    case CardStyle.standard:
      return dark
          ? const _Accent(Color(0xFF1E293B), Color(0xFF334155), Color(0xFF334155), Color(0xFFE2E8F0), Color(0xFF94A3B8), Icons.description_outlined)
          : const _Accent(Color(0xFFF8FAFC), Color(0xFFE2E8F0), Color(0xFFF1F5F9), Color(0xFF64748B), Color(0xFF64748B), Icons.description_outlined);
  }
}

_Accent _overdue(bool dark) => dark
    ? const _Accent(Color(0xFF4C0519), Color(0xFF881337), Color(0xFF881337), Color(0xFFFECDD3), Color(0xFFFB7185), Icons.check_circle_outline)
    : const _Accent(Color(0xFFFFF1F2), Color(0xFFFFE4E6), Color(0xFFFFE4E6), Color(0xFFE11D48), Color(0xFFF43F5E), Icons.check_circle_outline);

/// One record. The same card for every table (the Goals look); its colour and icon say which table it is.
class RecordCard extends StatelessWidget {
  final NfRecord r;
  final Widget? leading;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final bool flat; // kept for existing call sites; every card now has its own accent background
  final CardStyle style;
  final List<RelatedInfo> related;
  const RecordCard(this.r, {super.key, this.leading, this.onTap, this.onLongPress, this.flat = false, this.style = CardStyle.standard, this.related = const []});

  bool get _done => r.done == true || (r.status != null && RegExp('done|complete', caseSensitive: false).hasMatch(r.status!));

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final due = r.due == null ? null : formatDue(r.due!, done: _done);
    final a = style == CardStyle.task && due != null && due.overdue && !_done ? _overdue(dark) : _accent(style == CardStyle.task && _done ? CardStyle.goal : style, dark);
    final pt = priorityTone(r.priority);
    final isHabit = style == CardStyle.habit;
    final duePrefix = style == CardStyle.goal ? 'Target ' : (style == CardStyle.project ? 'Deadline ' : '');

    final pills = <Widget>[
      if (due != null) Pill('$duePrefix${due.label}', tone: due.overdue ? Tone.red : (due.today ? Tone.amber : Tone.slate), icon: Icons.event_outlined),
      if (r.priority != null) Pill(r.priority!, tone: pt),
      if (r.status != null) Pill(r.status!, tone: statusTone(r.status)),
      if (r.amount != null && !isHabit) Pill(_num(r.amount!), tone: Tone.violet, icon: Icons.hourglass_bottom),
    ];

    Widget circle;
    if (r.progress != null) {
      circle = SizedBox(
        width: 56,
        height: 56,
        child: Stack(alignment: Alignment.center, children: [
          SizedBox.expand(child: CircularProgressIndicator(value: (r.progress! / 100).clamp(0.0, 1.0), strokeWidth: 6, strokeCap: StrokeCap.round, color: a.ring, backgroundColor: a.circle)),
          Text('${r.progress!.round()}%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: a.fg)),
        ]),
      );
    } else if (isHabit) {
      final ymd = (r.due ?? r.lastEdited).substring(0, 10).split('-');
      circle = Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(color: a.circle, shape: BoxShape.circle),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(_months[int.parse(ymd[1]) - 1], style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 0.5, color: a.fg)),
          Text('${int.parse(ymd[2])}', style: TextStyle(fontSize: 19, fontWeight: FontWeight.w800, height: 1.1, color: a.fg)),
        ]),
      );
    } else {
      circle = Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(color: a.circle, shape: BoxShape.circle),
        child: Icon(_done && style == CardStyle.task ? Icons.check : a.icon, color: a.fg, size: 24),
      );
    }

    return AppCard(
      color: a.card,
      borderColor: a.border,
      padding: EdgeInsets.fromLTRB(leading != null ? 6 : 14, 12, 4, 12),
      onTap: onTap,
      onLongPress: onLongPress,
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
        if (leading != null) leading!,
        circle,
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              r.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    decoration: _done ? TextDecoration.lineThrough : null,
                    color: _done ? cs.outline : null,
                  ),
            ),
            if (pills.isNotEmpty) ...[const SizedBox(height: 8), Wrap(spacing: 6, runSpacing: 6, children: pills)],
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
                      decoration: BoxDecoration(color: cs.surface, borderRadius: BorderRadius.circular(8), border: Border.all(color: cs.outlineVariant)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.link, size: 12, color: a.fg),
                        const SizedBox(width: 4),
                        Flexible(child: Text(x.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.labelSmall)),
                      ]),
                    ),
                  ),
              ]),
            ],
          ]),
        ),
        if (isHabit && r.amount != null)
          Padding(padding: const EdgeInsets.symmetric(horizontal: 6), child: Text(_num(r.amount!), style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: a.fg))),
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
