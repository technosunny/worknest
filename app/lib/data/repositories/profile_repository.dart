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
}
