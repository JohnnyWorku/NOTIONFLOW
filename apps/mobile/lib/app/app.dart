import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'router.dart';

class NotionFlowApp extends ConsumerWidget {
  const NotionFlowApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'NotionFlow',
      theme: ThemeData(colorSchemeSeed: Colors.blueGrey, useMaterial3: true),
      routerConfig: ref.watch(routerProvider),
    );
  }
}
