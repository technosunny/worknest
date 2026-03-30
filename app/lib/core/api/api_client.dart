import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';
import 'api_endpoints.dart';

class ApiClient {
  late Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  bool _isRefreshing = false;

  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: AppConstants.tokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 && !_isRefreshing) {
          _isRefreshing = true;
          try {
            final refreshed = await _refreshToken();
            if (refreshed) {
              final token = await _storage.read(key: AppConstants.tokenKey);
              error.requestOptions.headers['Authorization'] = 'Bearer $token';
              final response = await _dio.fetch(error.requestOptions);
              handler.resolve(response);
              return;
            }
          } catch (_) {
            await _clearTokens();
          } finally {
            _isRefreshing = false;
          }
        }
        handler.next(error);
      },
    ));
  }

  Future<bool> _refreshToken() async {
    final refreshToken = await _storage.read(key: AppConstants.refreshTokenKey);
    if (refreshToken == null) return false;
    try {
      final response = await Dio(BaseOptions(baseUrl: AppConstants.baseUrl))
          .post(ApiEndpoints.refresh, data: {'refreshToken': refreshToken});
      final data = response.data['data'];
      await _storage.write(key: AppConstants.tokenKey, value: data['accessToken']);
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<void> _clearTokens() async {
    await _storage.delete(key: AppConstants.tokenKey);
    await _storage.delete(key: AppConstants.refreshTokenKey);
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data, Options? options}) {
    return _dio.post(path, data: data, options: options);
  }

  Future<Response> patch(String path, {dynamic data, Options? options}) {
    return _dio.patch(path, data: data, options: options);
  }

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: AppConstants.tokenKey, value: accessToken);
    await _storage.write(key: AppConstants.refreshTokenKey, value: refreshToken);
  }

  Future<void> clearTokens() => _clearTokens();

  Future<bool> hasToken() async {
    final token = await _storage.read(key: AppConstants.tokenKey);
    return token != null;
  }
}
