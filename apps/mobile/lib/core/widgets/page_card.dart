import 'package:flutter/material.dart';
import '../../features/tasks/record.dart';
import 'app_card.dart';
import 'icon_map.dart';

/// A Notion page as a card (same look as the record cards, amber accent).
class PageCard extends StatelessWidget {
  final PageRef page;
  final VoidCallback onTap;
  const PageCard({super.key, required this.page, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final fg = dark ? const Color(0xFFFDE68A) : const Color(0xFFB45309);
    return AppCard(
      color: dark ? const Color(0xFF451A03) : const Color(0xFFFFFBEB),
      borderColor: dark ? const Color(0xFF78350F) : const Color(0xFFFEF3C7),
      padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
      onTap: onTap,
      child: Row(children: [
        Container(
          width: 56,
          height: 56,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: dark ? const Color(0xFF78350F) : const Color(0xFFFEF3C7), shape: BoxShape.circle),
          child: page.icon != null ? Text(page.icon!, style: const TextStyle(fontSize: 26)) : Icon(collectionIcon(page.iconName ?? 'folder'), color: fg, size: 24),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(page.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
            Text('Notion page', style: Theme.of(context).textTheme.bodySmall),
          ]),
        ),
        Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.outline),
      ]),
    );
  }
}
