import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/config/settings.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsState();
}

class _SettingsState extends ConsumerState<SettingsScreen> {
  final _url = TextEditingController();
  final _key = TextEditingController();
  bool _loaded = false;

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(settingsProvider);
    if (!_loaded && s.hasValue) {
      _url.text = s.value!.baseUrl;
      _key.text = s.value!.apiKey;
      _loaded = true;
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        TextField(controller: _url, decoration: const InputDecoration(labelText: 'API base URL', helperText: 'Emulator: http://10.0.2.2:4000/api  ·  Phone: http://<laptop-LAN-IP>:4000/api  ·  Production: https://…')),
        const SizedBox(height: 12),
        TextField(controller: _key, obscureText: true, decoration: const InputDecoration(labelText: 'App API key (APP_API_KEY)', helperText: 'Stored in the device keystore. This is NOT your Notion token.')),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () async {
            await ref.read(settingsProvider.notifier).save(_url.text, _key.text);
            if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved')));
          },
          child: const Text('Save'),
        ),
      ]),
    );
  }
}
