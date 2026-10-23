import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/config/settings.dart';
import '../../core/widgets/app_card.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsState();
}

class _SettingsState extends ConsumerState<SettingsScreen> {
  final _url = TextEditingController();
  bool _loaded = false;

  @override
  void dispose() {
    _url.dispose();
    super.dispose();
  }

  Future<void> _signOut() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('You will need your password to sign in again.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Sign out')),
        ],
      ),
    );
    if (ok == true) await ref.read(settingsProvider.notifier).signOut();
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(settingsProvider);
    if (!_loaded && s.hasValue) {
      _url.text = s.value!.baseUrl;
      _loaded = true;
    }
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 32), children: [
        AppCard(
          child: Row(children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: cs.primaryContainer, borderRadius: BorderRadius.circular(14)),
              child: Icon(Icons.verified_user_outlined, color: cs.onPrimaryContainer),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Signed in', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                Text('Session kept in the device keystore', style: Theme.of(context).textTheme.bodySmall),
              ]),
            ),
          ]),
        ),
        const SectionHeader('Server'),
        AppCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            TextField(
              controller: _url,
              keyboardType: TextInputType.url,
              autocorrect: false,
              decoration: fieldDecoration(
                context,
                label: 'Server address',
                icon: Icons.dns_outlined,
                helper: 'Emulator: http://10.0.2.2:4000/api · Wi-Fi: http://<laptop-IP>:4000/api · Production: https://…/api',
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () async {
                await ref.read(settingsProvider.notifier).saveUrl(_url.text);
                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Saved')));
              },
              child: const Text('Save address'),
            ),
          ]),
        ),
        const SectionHeader('Account'),
        OutlinedButton.icon(onPressed: _signOut, icon: const Icon(Icons.logout), label: const Text('Sign out')),
      ]),
    );
  }
}
