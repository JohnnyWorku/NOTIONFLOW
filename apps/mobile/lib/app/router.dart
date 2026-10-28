import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/config/settings.dart';
import '../features/auth/login_screen.dart';
import '../features/collections/collections_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/pages/notion_page_screen.dart';
import '../features/records/records_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/stats/stats_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final loggedIn = ref.watch(loggedInProvider);
  final router = GoRouter(
    initialLocation: '/dashboard',
    redirect: (context, state) {
      final loc = state.matchedLocation;
      if (loggedIn == null) return loc == '/splash' ? null : '/splash';
      if (!loggedIn) return loc == '/login' ? null : '/login';
      if (loc == '/login' || loc == '/splash') return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const Scaffold(body: Center(child: CircularProgressIndicator()))),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => Scaffold(
          body: shell,
          bottomNavigationBar: NavigationBar(
            selectedIndex: shell.currentIndex,
            onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
            destinations: const [
              NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Home'),
              NavigationDestination(icon: Icon(Icons.check_circle_outline), label: 'Tasks'),
              NavigationDestination(icon: Icon(Icons.insights_outlined), label: 'Stats'),
              NavigationDestination(icon: Icon(Icons.grid_view_outlined), label: 'Tables'),
              NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Settings'),
            ],
          ),
        ),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/tasks', builder: (_, __) => const RecordsScreen(kind: 'tasks'))]),
          StatefulShellBranch(routes: [GoRoute(path: '/stats', builder: (_, __) => const StatsScreen())]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/collections',
              builder: (_, __) => const CollectionsScreen(),
              routes: [
                GoRoute(path: 'page/:id', builder: (_, state) => NotionPageScreen(id: state.pathParameters['id']!)),
                GoRoute(path: ':key', builder: (_, state) => RecordsScreen(kind: state.pathParameters['key']!)),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen())]),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});
