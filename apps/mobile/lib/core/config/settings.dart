import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../network/api_exception.dart';

/// Android emulator reaches the host machine at 10.0.2.2. A physical phone needs the laptop's LAN IP,
/// or your deployed https:// backend address.
const defaultBaseUrl = 'http://10.0.2.2:4000/api';

class AppSettings {
  final String baseUrl;
  final String token; // session token from POST /auth/login (empty = signed out)
  const AppSettings({required this.baseUrl, required this.token});
}

class SettingsNotifier extends AsyncNotifier<AppSettings> {
  static const _storage = FlutterSecureStorage();

  @override
  Future<AppSettings> build() async {
    final url = await _storage.read(key: 'baseUrl');
    final token = await _storage.read(key: 'token');
    return AppSettings(baseUrl: url ?? defaultBaseUrl, token: token ?? '');
  }

  static String normalize(String url) => url.trim().replaceAll(RegExp(r'/+$'), '');

  /// Verifies the password against the server and stores the returned session token in the device keystore.
  Future<void> signIn(String baseUrl, String password) async {
    final url = normalize(baseUrl);
    final dio = Dio(BaseOptions(
      baseUrl: url,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
    ));
    try {
      final res = await dio.post<dynamic>('/auth/login', data: {'password': password});
      final token = (res.data as Map<String, dynamic>)['token'] as String;
      await _storage.write(key: 'baseUrl', value: url);
      await _storage.write(key: 'token', value: token);
      state = AsyncData(AppSettings(baseUrl: url, token: token));
    } on DioException catch (e) {
      final ex = ApiException.fromDio(e);
      throw ex.status == 429 ? ApiException('Too many attempts. Wait a minute and try again.', status: 429) : ex;
    }
  }

  Future<void> saveUrl(String baseUrl) async {
    final url = normalize(baseUrl);
    await _storage.write(key: 'baseUrl', value: url);
    final cur = state.valueOrNull;
    state = AsyncData(AppSettings(baseUrl: url, token: cur?.token ?? ''));
  }

  Future<void> signOut() async {
    await _storage.delete(key: 'token');
    final cur = state.valueOrNull;
    state = AsyncData(AppSettings(baseUrl: cur?.baseUrl ?? defaultBaseUrl, token: ''));
  }
}

final settingsProvider = AsyncNotifierProvider<SettingsNotifier, AppSettings>(SettingsNotifier.new);

/// null while the stored session is loading; then true/false. Only changes on sign-in/out (not on URL edits).
final loggedInProvider = Provider<bool?>((ref) {
  final s = ref.watch(settingsProvider);
  if (s.isLoading && !s.hasValue) return null;
  return (s.valueOrNull?.token ?? '').isNotEmpty;
});
