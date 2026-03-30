enum AttendanceStatus { present, halfDay, absent, late, unknown }

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

    final rawCheckIn = json['checkIn'] ?? json['check_in'] ?? json['checkInTime'];
    final rawCheckOut = json['checkOut'] ?? json['check_out'] ?? json['checkOutTime'];

    if (rawCheckIn != null) {
      checkIn = DateTime.tryParse(rawCheckIn.toString())?.toLocal();
    }
    if (rawCheckOut != null) {
      checkOut = DateTime.tryParse(rawCheckOut.toString())?.toLocal();
    }

    final rawDate = json['date'] ?? json['createdAt'];
    DateTime date = DateTime.now();
    if (rawDate != null) {
      date = DateTime.tryParse(rawDate.toString())?.toLocal() ?? DateTime.now();
    }

    double? hours;
    final rawHours = json['hoursWorked'] ?? json['hours_worked'] ?? json['totalHours'];
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
    }

    return AttendanceModel(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      date: date,
      checkInTime: checkIn,
      checkOutTime: checkOut,
      hoursWorked: hours,
      status: status,
      checkInLocation: json['checkInLocation']?.toString() ?? json['location']?.toString(),
      checkOutLocation: json['checkOutLocation']?.toString(),
      selfieUrl: json['selfie'] ?? json['selfieUrl'] ?? json['photo'],
    );
  }
}
