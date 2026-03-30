class ApiEndpoints {
  static const String login = '/api/auth/login';
  static const String refresh = '/api/auth/refresh';
  static const String profile = '/api/employee/profile';
  static const String checkIn = '/api/employee/check-in';
  static const String checkOut = '/api/employee/check-out';
  static const String attendanceToday = '/api/employee/attendance/today';
  static const String attendanceHistory = '/api/employee/attendance';
  static String branding(String slug) => '/api/public/branding/$slug';
}
