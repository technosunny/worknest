enum AttendanceStatus { present, halfDay, absent, late, weekend, holiday, unknown }

class AttendanceModel {
  final String id;
  final DateTime date;
  final DateTime? checkInTime;
  final DateTime? checkOutTime;
  final double? hoursWorked;
  final AttendanceStatus status;
  final String? checkInLocation;
  final String? checkOutLocation;
  final String? selfieUrl;

  AttendanceModel({
    required this.id,
    required this.date,
    this.checkInTime,
    this.checkOutTime,
    this.hoursWorked,
    this.status = AttendanceStatus.unknown,
    this.checkInLocation,
    this.checkOutLocation,
    this.selfieUrl,
  });

  bool get isCheckedIn => checkInTime != null;
  bool get isCheckedOut => checkOutTime != null;
  bool get isActive => isCheckedIn && !isCheckedOut;

  Duration get currentDuration {
    if (checkInTime == null) return Duration.zero;
    final end = checkOutTime ?? DateTime.now();
    return end.difference(checkInTime!);
  }

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    DateTime? checkIn;
    DateTime? checkOut;

    // Backend returns check_in_time / check_out_time (snake_case)
    final rawCheckIn = json['check_in_time'] ??
        json['checkIn'] ??
        json['check_in'] ??
        json['checkInTime'];
    final rawCheckOut = json['check_out_time'] ??
        json['checkOut'] ??
        json['check_out'] ??
        json['checkOutTime'];

    if (rawCheckIn != null) {
      checkIn = DateTime.tryParse(rawCheckIn.toString())?.toLocal();
    }
    if (rawCheckOut != null) {
      checkOut = DateTime.tryParse(rawCheckOut.toString())?.toLocal();
    }

    final rawDate = json['date'] ?? json['created_at'] ?? json['createdAt'];
    DateTime date = DateTime.now();
    if (rawDate != null) {
      date = DateTime.tryParse(rawDate.toString())?.toLocal() ?? DateTime.now();
    }

    double? hours;
    // Backend returns total_hours
    final rawHours = json['total_hours'] ??
        json['hoursWorked'] ??
        json['hours_worked'] ??
        json['totalHours'];
    if (rawHours != null) {
      hours = double.tryParse(rawHours.toString());
    }

    AttendanceStatus status = AttendanceStatus.unknown;
    final rawStatus = (json['status'] ?? '').toString().toLowerCase();
    switch (rawStatus) {
      case 'present':
        status = AttendanceStatus.present;
        break;
      case 'half_day':
      case 'halfday':
      case 'half-day':
        status = AttendanceStatus.halfDay;
        break;
      case 'absent':
        status = AttendanceStatus.absent;
        break;
      case 'late':
        status = AttendanceStatus.late;
        break;
      case 'weekend':
        status = AttendanceStatus.weekend;
        break;
      case 'holiday':
        status = AttendanceStatus.holiday;
        break;
    }

    // Location: lat/lng fields from backend
    String? checkInLocation;
    final checkInLat = json['check_in_lat'];
    final checkInLng = json['check_in_lng'];
    if (checkInLat != null && checkInLng != null) {
      checkInLocation = '$checkInLat,$checkInLng';
    } else {
      checkInLocation =
          json['checkInLocation']?.toString() ?? json['location']?.toString();
    }

    String? checkOutLocation;
    final checkOutLat = json['check_out_lat'];
    final checkOutLng = json['check_out_lng'];
    if (checkOutLat != null && checkOutLng != null) {
      checkOutLocation = '$checkOutLat,$checkOutLng';
    } else {
      checkOutLocation = json['checkOutLocation']?.toString();
    }

    return AttendanceModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      date: date,
      checkInTime: checkIn,
      checkOutTime: checkOut,
      hoursWorked: hours,
      status: status,
      checkInLocation: checkInLocation,
      checkOutLocation: checkOutLocation,
      // Backend returns check_in_selfie_url
      selfieUrl: json['check_in_selfie_url'] ??
          json['selfie'] ??
          json['selfieUrl'] ??
          json['photo'],
    );
  }
}
