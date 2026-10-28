import 'package:flutter/material.dart';
import '../format.dart';

(Color, Color) toneColors(Tone t, bool dark) {
  switch (t) {
    case Tone.green: return dark ? (const Color(0xFF064E3B), const Color(0xFFA7F3D0)) : (const Color(0xFFD1FAE5), const Color(0xFF065F46));
    case Tone.blue: return dark ? (const Color(0xFF1E3A8A), const Color(0xFFBFDBFE)) : (const Color(0xFFDBEAFE), const Color(0xFF1E40AF));
    case Tone.amber: return dark ? (const Color(0xFF78350F), const Color(0xFFFDE68A)) : (const Color(0xFFFEF3C7), const Color(0xFF92400E));
    case Tone.red: return dark ? (const Color(0xFF881337), const Color(0xFFFECDD3)) : (const Color(0xFFFFE4E6), const Color(0xFF9F1239));
    case Tone.violet: return dark ? (const Color(0xFF4C1D95), const Color(0xFFDDD6FE)) : (const Color(0xFFEDE9FE), const Color(0xFF5B21B6));
    case Tone.slate: return dark ? (const Color(0xFF334155), const Color(0xFFE2E8F0)) : (const Color(0xFFF1F5F9), const Color(0xFF334155));
  }
}

/// Rounded, bordered surface used everywhere instead of the stock Card.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final Color? color;
  final Color? borderColor;
  const AppCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.onTap, this.onLongPress, this.color, this.borderColor});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Material(
      color: color ?? cs.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: BorderSide(color: borderColor ?? cs.outlineVariant)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(onTap: onTap, onLongPress: onLongPress, child: Padding(padding: padding, child: child)),
    );
  }
}

class Pill extends StatelessWidget {
  final String text;
  final Tone tone;
  final IconData? icon;
  const Pill(this.text, {super.key, this.tone = Tone.slate, this.icon});

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final (bg, fg) = toneColors(tone, dark);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(99)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 12, color: fg), const SizedBox(width: 4)],
        Flexible(child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: fg))),
      ]),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String title;
  final int? count;
  final Widget? trailing;
  const SectionHeader(this.title, {super.key, this.count, this.trailing});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 20, 4, 10),
      child: Row(children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
        if (count != null) ...[
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(99)),
            child: Text('$count', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: cs.onSurfaceVariant)),
          ),
        ],
        const Spacer(),
        if (trailing != null) trailing!,
      ]),
    );
  }
}

class StatTile extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Tone tone;
  const StatTile({super.key, required this.label, required this.value, required this.icon, this.tone = Tone.blue});

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final (bg, fg) = toneColors(tone, dark);
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(width: 36, height: 36, decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(11)), child: Icon(icon, size: 19, color: fg)),
        const SizedBox(height: 12),
        Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ]),
    );
  }
}

/// Pulsing placeholder rows shown while data loads.
class SkeletonList extends StatefulWidget {
  final int count;
  final double itemHeight;
  const SkeletonList({super.key, this.count = 4, this.itemHeight = 72});
  @override
  State<SkeletonList> createState() => _SkeletonState();
}

class _SkeletonState extends State<SkeletonList> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat(reverse: true);

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return FadeTransition(
      opacity: Tween<double>(begin: 0.45, end: 1).animate(_c),
      child: Column(children: [
        for (var i = 0; i < widget.count; i++)
          Container(
            height: widget.itemHeight,
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(color: cs.surfaceContainerHighest, borderRadius: BorderRadius.circular(18)),
          ),
      ]),
    );
  }
}

InputDecoration fieldDecoration(BuildContext context, {String? label, String? hint, IconData? icon, Widget? suffix, String? helper}) {
  final cs = Theme.of(context).colorScheme;
  OutlineInputBorder b(Color c, [double w = 1]) =>
      OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: c, width: w));
  return InputDecoration(
    labelText: label,
    hintText: hint,
    helperText: helper,
    helperMaxLines: 3,
    prefixIcon: icon == null ? null : Icon(icon),
    suffixIcon: suffix,
    filled: true,
    fillColor: cs.surface,
    border: b(cs.outlineVariant),
    enabledBorder: b(cs.outlineVariant),
    focusedBorder: b(cs.primary, 1.6),
    errorBorder: b(cs.error),
    focusedErrorBorder: b(cs.error, 1.6),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
  );
}
