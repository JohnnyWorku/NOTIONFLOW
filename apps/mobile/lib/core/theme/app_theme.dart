import 'package:flutter/material.dart';

/// Indigo Material 3 theme with matching light and dark variants (follows the phone's setting).
class AppTheme {
  static const seed = Color(0xFF4F46E5);

  static ThemeData light() => _build(Brightness.light);
  static ThemeData dark() => _build(Brightness.dark);

  static ThemeData _build(Brightness b) {
    final cs = ColorScheme.fromSeed(seedColor: seed, brightness: b);
    final bg = b == Brightness.dark ? const Color(0xFF0B1020) : const Color(0xFFF5F6FB);
    final shape12 = RoundedRectangleBorder(borderRadius: BorderRadius.circular(12));
    return ThemeData(
      useMaterial3: true,
      colorScheme: cs,
      scaffoldBackgroundColor: bg,
      appBarTheme: AppBarTheme(
        backgroundColor: bg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: cs.onSurface),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: 66,
        backgroundColor: cs.surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: cs.primaryContainer,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => TextStyle(fontSize: 11.5, fontWeight: states.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(minimumSize: const Size(0, 48), shape: shape12)),
      outlinedButtonTheme: OutlinedButtonThemeData(style: OutlinedButton.styleFrom(minimumSize: const Size(0, 48), shape: shape12)),
      floatingActionButtonTheme: FloatingActionButtonThemeData(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
      snackBarTheme: SnackBarThemeData(behavior: SnackBarBehavior.floating, shape: shape12),
      dividerTheme: DividerThemeData(color: cs.outlineVariant, space: 1),
    );
  }
}
