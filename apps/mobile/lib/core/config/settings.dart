import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Android emulator reaches the host machine at 10.0.2.2. A physical phone needs the laptop's LAN IP.
const defaultBaseUrl = 'http://10.0.2.2:4000/api';

class AppSettings {
  final String baseUrl;
  final String apiKey;
  const AppSettings({required this.baseUrl, required this.apiKey});
}

class SettingsNotifier extends AsyncNotifier<AppSettings> {
  static const _storage = FlutterSecureStorage();

  @override
  Future<AppSettings> build() async {
    final url = await _storage.read(key: 'baseUrl');
    final key = await _storage.read(key: 'apiKey');
    return AppSettings(baseUrl: url ?? defaultBaseUrl, apiKey: key ?? '');
  }

  Future<void> save(String baseUrl, String apiKey) async {
    final url = baseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    await _storage.write(key: 'baseUrl', value: url);
    await _storage.write(key: 'apiKey', value: apiKey.trim());
    state = AsyncData(AppSettings(baseUrl: url, apiKey: apiKey.trim()));
  }
}

final settingsProvider = AsyncNotifierProvider<SettingsNotifier, AppSettings>(SettingsNotifier.new);
