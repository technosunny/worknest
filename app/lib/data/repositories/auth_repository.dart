import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/constants/app_constants.dart';
import '../models/auth_model.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiClient _client = ApiClient();

  Future<AuthModel> login(String email, String password) async {
    try {
      final response = await _client.post(
        ApiEndpoints.login,
        data: {'email': email, 'password': password},
      );
      final data = response.data['data'] ?? response.data;
      final auth = AuthModel.fromJson(data);
      await _client.saveTokens(auth.accessToken, auth.refreshToken);
      return auth;
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Login failed. Please try again.';
      throw Exception(msg);
    }
  }

  Future<void> logout() async {
    await _client.clearTokens();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.userKey);
  }

  Future<bool> isLoggedIn() => _client.hasToken();

  Future<void> saveUserLocally(UserModel user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(AppConstants.userKey, jsonEncode(user.toJson()));
  }

  Future<UserModel?> getCachedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(AppConstants.userKey);
    if (raw == null) return null;
    return UserModel.fromJson(jsonDecode(raw));
  }
}
