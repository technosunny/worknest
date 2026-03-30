import 'package:equatable/equatable.dart';
import '../../data/models/attendance_model.dart';

abstract class AttendanceState extends Equatable {
  @override
  List<Object?> get props => [];
}

class AttendanceInitial extends AttendanceState {}

class AttendanceLoading extends AttendanceState {}

class AttendanceTodayLoaded extends AttendanceState {
  final AttendanceModel? today;
  AttendanceTodayLoaded(this.today);

  @override
  List<Object?> get props => [today];
}

class AttendanceCheckInLoading extends AttendanceState {}

class AttendanceCheckInSuccess extends AttendanceState {
  final AttendanceModel attendance;
  AttendanceCheckInSuccess(this.attendance);

  @override
  List<Object?> get props => [attendance];
}

class AttendanceCheckOutLoading extends AttendanceState {}

class AttendanceCheckOutSuccess extends AttendanceState {
  final AttendanceModel attendance;
  AttendanceCheckOutSuccess(this.attendance);

  @override
  List<Object?> get props => [attendance];
}

class AttendanceHistoryLoaded extends AttendanceState {
  final List<AttendanceModel> records;
  final bool hasMore;
  final int currentPage;

  AttendanceHistoryLoaded({
    required this.records,
    required this.hasMore,
    required this.currentPage,
  });

  @override
  List<Object?> get props => [records, hasMore, currentPage];
}

class AttendanceHistoryLoadingMore extends AttendanceHistoryLoaded {
  AttendanceHistoryLoadingMore({
    required super.records,
    required super.hasMore,
    required super.currentPage,
  });
}

class AttendanceError extends AttendanceState {
  final String message;
  AttendanceError(this.message);

  @override
  List<Object?> get props => [message];
}
