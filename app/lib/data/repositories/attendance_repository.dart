import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../models/attendance_model.dart';

class AttendanceRepository {
  final ApiClient _client = ApiClient();

  Future<AttendanceModel?> getTodayAttendance() async {
    try {
      final response = await _client.get(ApiEndpoints.attendanceToday);
      final data = response.data['data'];
      if (data == null) return null;
      // API returns {checked_in: false, status: "not_recorded"} when no record exists
      if (data is Map && (data['checked_in'] == false && data['id'] == null)) {
        return null;
      }
      return AttendanceModel.fromJson(data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      final msg = e.response?.data?['message'] ?? 'Failed to fetch attendance';
      throw Exception(msg);
    }
  }

  Future<AttendanceModel> checkIn({
    required double latitude,
    required double longitude,
    required Uint8List selfieBytes,
  }) async {
    try {
      final formData = FormData.fromMap({
        'lat': latitude.toString(),
        'lng': longitude.toString(),
        'selfie': MultipartFile.fromBytes(
          selfieBytes,
          filename: 'selfie_${DateTime.now().millisecondsSinceEpoch}.jpg',
        ),
      });
      final response = await _client.post(
        ApiEndpoints.checkIn,
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );
      final data = response.data['data'] ?? response.data;
      return AttendanceModel.fromJson(data);
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Check-in failed. Please try again.';
      throw Exception(msg);
    }
  }

  Future<AttendanceModel> checkOut({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final response = await _client.post(
        ApiEndpoints.checkOut,
        data: {
          'lat': latitude,
          'lng': longitude,
        },
      );
      final data = response.data['data'] ?? response.data;
      return AttendanceModel.fromJson(data);
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Check-out failed. Please try again.';
      throw Exception(msg);
    }
  }

  Future<List<AttendanceModel>> getAttendanceHistory({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _client.get(
        ApiEndpoints.attendanceHistory,
        queryParameters: {'page': page, 'limit': limit},
      );
      final rawData = response.data['data'];
      List<dynamic> list = [];
      if (rawData is List) {
        list = rawData;
      } else if (rawData is Map && rawData['records'] != null) {
        list = rawData['records'] as List;
      } else if (rawData is Map && rawData['attendance'] != null) {
        list = rawData['attendance'] as List;
      }
      return list.map((e) => AttendanceModel.fromJson(e)).toList();
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Failed to fetch history';
      throw Exception(msg);
    }
  }
}
