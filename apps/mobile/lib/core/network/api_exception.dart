import 'package:dio/dio.dart';

class ApiException implements Exception {
  final int? status;
  final String message;
  final Map<String, dynamic>? body;
  ApiException(this.message, {this.status, this.body});

  bool get isConflict => status == 409;
  bool get isUnauthorized => status == 401;

  factory ApiException.fromDio(DioException e) {
    final body = e.response?.data;
    final serverMsg = body is Map && body['message'] is String ? body['message'] as String : null;
    final unreachable = e.type == DioExceptionType.connectionError ||
        e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout;
    return ApiException(
      serverMsg ?? (unreachable ? 'Cannot reach the server. Check the server address and your connection.' : 'Request failed'),
      status: e.response?.statusCode,
      body: body is Map<String, dynamic> ? body : null,
    );
  }

  @override
  String toString() => message;
}
