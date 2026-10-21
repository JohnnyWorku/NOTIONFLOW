import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/records/records_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/tasks/tasks_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/dashboard',
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, shell) => Scaffold(
          body: shell,
          bottomNavigationBar: NavigationBar(
            selectedIndex: shell.currentIndex,
            onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
            destinations: const [
              NavigationDestination(icon: Icon(Icons.dashboard_outlined), label: 'Home'),
              NavigationDestination(icon: Icon(Icons.check_circle_outline), label: 'Tasks'),
              NavigationDestination(icon: Icon(Icons.folder_outlined), label: 'Projects'),
              NavigationDestination(icon: Icon(Icons.school_outlined), label: 'Learning'),
              NavigationDestination(icon: Icon(Icons.flag_outlined), label: 'Goals'),
              NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Settings'),
            ],
          ),
        ),
        branches: [
          StatefulShellBranch(routes: [GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/tasks', builder: (_, __) => const TasksScreen())]),
          StatefulShellBranch(routes: [GoRoute(path: '/projects', builder: (_, __) => const RecordsScreen(kind: 'projects', title: 'Projects'))]),
          StatefulShellBranch(routes: [GoRoute(path: '/learning', builder: (_, __) => const RecordsScreen(kind: 'learning', title: 'Learning'))]),
          StatefulShellBranch(routes: [GoRoute(path: '/goals', builder: (_, __) => const RecordsScreen(kind: 'goals', title: 'Goals'))]),
          StatefulShellBranch(routes: [GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen())]),
        ],
      ),
    ],
  );
});
