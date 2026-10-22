import 'package:flutter/material.dart';

IconData collectionIcon(String? name) {
  switch (name) {
    case 'check': return Icons.check_circle_outline;
    case 'folder': return Icons.folder_outlined;
    case 'target': return Icons.flag_outlined;
    case 'book': return Icons.menu_book_outlined;
    case 'sparkles': return Icons.auto_awesome;
    case 'heart': return Icons.favorite_border;
    case 'dumbbell': return Icons.fitness_center;
    case 'wallet': return Icons.account_balance_wallet_outlined;
    case 'moon': return Icons.nightlight_outlined;
    case 'sun': return Icons.wb_sunny_outlined;
    case 'star': return Icons.star_border;
    case 'leaf': return Icons.eco_outlined;
    case 'brain': return Icons.psychology_outlined;
    default: return Icons.folder_outlined;
  }
}
