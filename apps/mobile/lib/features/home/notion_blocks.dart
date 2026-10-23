import 'package:flutter/material.dart';
import '../../core/widgets/app_card.dart';
import 'home_models.dart';

/// Read-only rendering of a mirrored Notion page.
class NotionBlocksView extends StatelessWidget {
  final List<Block> blocks;
  final void Function(Block) onOpen;
  const NotionBlocksView({super.key, required this.blocks, required this.onOpen});

  @override
  Widget build(BuildContext context) {
    var n = 0;
    final out = <Widget>[];
    for (final b in blocks) {
      n = b.type == 'number' ? n + 1 : 0;
      out.add(Padding(padding: const EdgeInsets.only(bottom: 8), child: _one(context, b, n)));
    }
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: out);
  }

  InlineSpan _span(BuildContext context, List<Seg> segs, {TextStyle? base}) {
    final cs = Theme.of(context).colorScheme;
    return TextSpan(
      style: base,
      children: [
        for (final s in segs)
          TextSpan(
            text: s.text,
            style: TextStyle(
              fontWeight: s.bold ? FontWeight.w700 : null,
              fontStyle: s.italic ? FontStyle.italic : null,
              fontFamily: s.code ? 'monospace' : null,
              color: s.href != null ? cs.primary : null,
              decoration: s.strike ? TextDecoration.lineThrough : (s.href != null ? TextDecoration.underline : null),
            ),
          ),
      ],
    );
  }

  Widget _nested(Block b) =>
      b.children.isEmpty ? const SizedBox.shrink() : Padding(padding: const EdgeInsets.only(left: 18, top: 6), child: NotionBlocksView(blocks: b.children, onOpen: onOpen));

  Widget _tile(BuildContext context, Block b) {
    final cs = Theme.of(context).colorScheme;
    final label = b.title ?? (b.collectionKey != null ? 'Open table' : 'Open in Notion');
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      onTap: () => onOpen(b),
      child: Row(children: [
        Icon(b.type == 'database' ? Icons.table_chart_outlined : Icons.description_outlined, color: cs.primary, size: 20),
        const SizedBox(width: 12),
        Expanded(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600))),
        Icon(b.collectionKey != null ? Icons.chevron_right : Icons.open_in_new, size: 18, color: cs.outline),
      ]),
    );
  }

  Widget _one(BuildContext context, Block b, int n) {
    final t = Theme.of(context).textTheme;
    final cs = Theme.of(context).colorScheme;
    switch (b.type) {
      case 'heading':
        final style = b.level == 1 ? t.titleLarge : (b.level == 2 ? t.titleMedium : t.titleSmall);
        return Padding(padding: const EdgeInsets.only(top: 6), child: Text.rich(_span(context, b.text, base: style?.copyWith(fontWeight: FontWeight.w700))));
      case 'text':
        return Text.rich(_span(context, b.text, base: t.bodyMedium));
      case 'bullet':
      case 'number':
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(width: 22, child: Text(b.type == 'bullet' ? '•' : '$n.')),
            Expanded(child: Text.rich(_span(context, b.text, base: t.bodyMedium))),
          ]),
          _nested(b),
        ]);
      case 'todo':
        return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(b.checked ? Icons.check_box : Icons.check_box_outline_blank, size: 20, color: b.checked ? cs.primary : cs.outline),
          const SizedBox(width: 8),
          Expanded(
            child: Text.rich(_span(context, b.text,
                base: t.bodyMedium?.copyWith(decoration: b.checked ? TextDecoration.lineThrough : null, color: b.checked ? cs.outline : null))),
          ),
        ]);
      case 'callout':
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: cs.primaryContainer, borderRadius: BorderRadius.circular(14)),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            if (b.icon != null) ...[Text(b.icon!, style: const TextStyle(fontSize: 20)), const SizedBox(width: 10)],
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text.rich(_span(context, b.text, base: t.bodyMedium?.copyWith(color: cs.onPrimaryContainer))),
                _nested(b),
              ]),
            ),
          ]),
        );
      case 'quote':
        return Container(
          padding: const EdgeInsets.only(left: 12),
          decoration: BoxDecoration(border: Border(left: BorderSide(color: cs.outline, width: 3))),
          child: Text.rich(_span(context, b.text, base: t.bodyMedium?.copyWith(fontStyle: FontStyle.italic))),
        );
      case 'divider':
        return const Divider(height: 16);
      case 'toggle':
        return Theme(
          data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
          child: ExpansionTile(
            tilePadding: EdgeInsets.zero,
            childrenPadding: const EdgeInsets.only(left: 12),
            title: Text.rich(_span(context, b.text, base: t.bodyMedium?.copyWith(fontWeight: FontWeight.w600))),
            children: [NotionBlocksView(blocks: b.children, onOpen: onOpen)],
          ),
        );
      case 'columns':
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          for (final c in b.children) NotionBlocksView(blocks: c.children, onOpen: onOpen),
        ]);
      case 'column':
        return NotionBlocksView(blocks: b.children, onOpen: onOpen);
      case 'database':
      case 'page':
      case 'link':
        return _tile(context, b);
      default:
        return const SizedBox.shrink();
    }
  }
}
