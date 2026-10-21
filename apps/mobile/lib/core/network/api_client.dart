import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/settings.dart';

class ApiException implements Exception {
  final int? status;
  final String message;
  final Map<String, dynamic>? body;
  ApiException(this.message, {this.status, this.body});
  bool get isConflict => status == 409;
  @override
  String toString() => message;
}

class ApiClient {
  final Dio _dio;
  ApiClient(AppSettings s)
      : _dio = Dio(BaseOptions(
          baseUrl: s.baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 30),
          headers: {if (s.apiKey.isNotEmpty) 'Authorization': 'Bearer ${s.apiKey}'},
        ));

  /// For tests: inject a Dio with a fake adapter.
  ApiClient.withDio(this._dio);

  Future<dynamic> request(String method, String path,
      {Map<String, dynamic>? query, Object? data, Map<String, String>? headers}) async {
    try {
      final res = await _dio.request<dynamic>(path,
          queryParameters: query, data: data, options: Options(method: method, headers: headers));
      return res.data;
    } on DioException catch (e) {
      final body = e.response?.data;
      final msg = body is Map && body['message'] is String
          ? body['message'] as String
          : e.type == DioExceptionType.connectionError || e.type == DioExceptionType.connectionTimeout
              ? 'Cannot reach the server. Check the API URL in Settings and your network.'
              : 'Request failed';
      throw ApiException(msg, status: e.response?.statusCode, body: body is Map<String, dynamic> ? body : null);
    }
  }
}

final apiClientProvider = Provider<ApiClient>((ref) {
  final s = ref.watch(settingsProvider).valueOrNull ?? const AppSettings(baseUrl: defaultBaseUrl, apiKey: '');
  return ApiClient(s);
});
