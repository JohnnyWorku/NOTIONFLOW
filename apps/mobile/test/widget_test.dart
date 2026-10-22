import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:notionflow_mobile/core/widgets/state_views.dart';

void main() {
  testWidgets('ErrorView shows the message and retries', (tester) async {
    var retried = false;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: ErrorView(error: 'Boom', onRetry: () => retried = true)),
    ));
    expect(find.text('Boom'), findsOneWidget);
    await tester.tap(find.text('Retry'));
    expect(retried, isTrue);
  });

  testWidgets('EmptyView shows its text', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: EmptyView('No tasks found.'))));
    expect(find.text('No tasks found.'), findsOneWidget);
  });
}
