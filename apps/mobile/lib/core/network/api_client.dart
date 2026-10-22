import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/settings.dart';
import 'api_exception.dart';

export 'api_exception.dart';

class ApiClient {
  final Dio _dio;

  ApiClient(AppSettings s, {void Function()? onUnauthorized})
      : _dio = Dio(BaseOptions(
          baseUrl: s.baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 30),
          headers: {if (s.token.isNotEmpty) 'Authorization': 'Bearer ${s.token}'},
        )) {
    if (onUnauthorized != null) {
      _dio.interceptors.add(InterceptorsWrapper(onError: (e, handler) {
        if (e.response?.statusCode == 401) onUnauthorized();
        handler.next(e);
      }));
    }
  }

  /// For tests: inject a Dio with a fake adapter.
  ApiClient.withDio(this._dio);

  Future<dynamic> request(String method, String path,
      {Map<String, dynamic>? query, Object? data, Map<String, String>? headers}) async {
    try {
      final res = await _dio.request<dynamic>(path,
          queryParameters: query, data: data, options: Options(method: method, headers: headers));
      return res.data;
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  final s = ref.watch(settingsProvider).valueOrNull ?? const AppSettings(baseUrl: defaultBaseUrl, token: '');
  // A 401 means the session expired or was revoked: sign out so the router shows the login screen.
  return ApiClient(s, onUnauthorized: () => Future.microtask(() => ref.read(settingsProvider.notifier).signOut()));
});
