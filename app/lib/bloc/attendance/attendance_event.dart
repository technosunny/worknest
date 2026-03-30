import 'dart:io';
import 'package:equatable/equatable.dart';

abstract class AttendanceEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class AttendanceLoadToday extends AttendanceEvent {}

class AttendanceLoadHistory extends AttendanceEvent {
  final bool refresh;
  AttendanceLoadHistory({this.refresh = false});

  @override
  List<Object?> get props => [refresh];
}

class AttendanceLoadMoreHistory extends AttendanceEvent {}

class AttendanceCheckIn extends AttendanceEvent {
  final double latitude;
  final double longitude;
  final File selfie;

  AttendanceCheckIn({
    required this.latitude,
    required this.longitude,
    required this.selfie,
  });

  @override
  List<Object?> get props => [latitude, longitude];
}

class AttendanceCheckOut extends AttendanceEvent {
  final double latitude;
  final double longitude;

  AttendanceCheckOut({
    required this.latitude,
    required this.longitude,
  });

  @override
  List<Object?> get props => [latitude, longitude];
}
