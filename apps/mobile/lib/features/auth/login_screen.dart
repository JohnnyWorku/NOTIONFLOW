import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/config/settings.dart';
import '../../core/widgets/app_card.dart';
import '../../core/network/api_exception.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginState();
}

class _LoginState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _url = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _show = false;
  bool _prefilled = false;
  String? _error;

  @override
  void dispose() {
    _url.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() { _busy = true; _error = null; });
    try {
      // On success the router sees the new session and leaves this screen by itself.
      await ref.read(settingsProvider.notifier).signIn(_url.text, _password.text);
    } on ApiException catch (e) {
      if (mounted) setState(() { _error = e.message; _busy = false; });
    } catch (_) {
      if (mounted) setState(() { _error = 'Unexpected response from the server. Check the server address.'; _busy = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(settingsProvider);
    if (!_prefilled && s.hasValue) {
      _url.text = s.value!.baseUrl;
      _prefilled = true;
    }
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      body: SingleChildScrollView(
        child: Column(children: [
          Container(
            width: double.infinity,
            padding: EdgeInsets.fromLTRB(24, MediaQuery.of(context).padding.top + 48, 24, 48),
            decoration: BoxDecoration(
              gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [cs.primary, Color.lerp(cs.primary, cs.tertiary, 0.55)!]),
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(36)),
            ),
            child: Column(children: [
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(color: cs.onPrimary, borderRadius: BorderRadius.circular(22)),
                child: Icon(Icons.account_tree_outlined, color: cs.primary, size: 36),
              ),
              const SizedBox(height: 16),
              Text('NotionFlow', style: TextStyle(color: cs.onPrimary, fontSize: 28, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('Your Notion workspace, focused', style: TextStyle(color: cs.primaryContainer)),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: AppCard(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _form,
                  child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Text('Sign in', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _url,
                      keyboardType: TextInputType.url,
                      autocorrect: false,
                      decoration: fieldDecoration(context, label: 'Server address', icon: Icons.dns_outlined, helper: 'Ends with /api. Emulator: http://10.0.2.2:4000/api'),
                      validator: (v) => RegExp(r'^https?://').hasMatch((v ?? '').trim()) ? null : 'Must start with http:// or https://',
                    ),
                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _password,
                      obscureText: !_show,
                      autofillHints: const [AutofillHints.password],
                      onFieldSubmitted: (_) => _busy ? null : _submit(),
                      decoration: fieldDecoration(
                        context,
                        label: 'Password',
                        icon: Icons.lock_outline,
                        suffix: IconButton(
                          tooltip: _show ? 'Hide password' : 'Show password',
                          icon: Icon(_show ? Icons.visibility_off_outlined : Icons.visibility_outlined),
                          onPressed: () => setState(() => _show = !_show),
                        ),
                      ),
                      validator: (v) => (v == null || v.isEmpty) ? 'Enter your password' : null,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: cs.errorContainer, borderRadius: BorderRadius.circular(12)),
                        child: Text(_error!, style: TextStyle(color: cs.onErrorContainer)),
                      ),
                    ],
                    const SizedBox(height: 18),
                    FilledButton(
                      onPressed: _busy ? null : _submit,
                      child: _busy ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Sign in'),
                    ),
                  ]),
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}
