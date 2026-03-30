import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../models/user_model.dart';

class ProfileRepository {
  final ApiClient _client = ApiClient();

  Future<UserModel> getProfile() async {
    try {
      final response = await _client.get(ApiEndpoints.profile);
      final data = response.data['data'] ?? response.data;
      return UserModel.fromJson(data);
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to fetch profile';
      throw Exception(msg);
    }
  }

  Future<UserModel> updateProfile({
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    try {
      final response = await _client.patch(
        ApiEndpoints.updateProfile,
        data: {
          'first_name': firstName,
          'last_name': lastName,
          if (phone != null && phone.isNotEmpty) 'phone': phone,
        },
      );
      final data = response.data['data'] ?? response.data;
      return UserModel.fromJson(data);
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to update profile';
      throw Exception(msg);
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _client.post(
        ApiEndpoints.changePassword,
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to change password';
      throw Exception(msg);
    }
  }
}
