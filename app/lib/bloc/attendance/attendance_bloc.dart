import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/repositories/attendance_repository.dart';
import 'attendance_event.dart';
import 'attendance_state.dart';

class AttendanceBloc extends Bloc<AttendanceEvent, AttendanceState> {
  final AttendanceRepository _repo = AttendanceRepository();

  AttendanceBloc() : super(AttendanceInitial()) {
    on<AttendanceLoadToday>(_onLoadToday);
    on<AttendanceLoadHistory>(_onLoadHistory);
    on<AttendanceLoadMoreHistory>(_onLoadMoreHistory);
    on<AttendanceCheckIn>(_onCheckIn);
    on<AttendanceCheckOut>(_onCheckOut);
  }

  Future<void> _onLoadToday(
    AttendanceLoadToday event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceLoading());
    try {
      final today = await _repo.getTodayAttendance();
      emit(AttendanceTodayLoaded(today));
    } catch (e) {
      emit(AttendanceError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onLoadHistory(
    AttendanceLoadHistory event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceLoading());
    try {
      final records = await _repo.getAttendanceHistory(page: 1);
      emit(AttendanceHistoryLoaded(
        records: records,
        hasMore: records.length == 20,
        currentPage: 1,
      ));
    } catch (e) {
      emit(AttendanceError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onLoadMoreHistory(
    AttendanceLoadMoreHistory event,
    Emitter<AttendanceState> emit,
  ) async {
    final current = state;
    if (current is! AttendanceHistoryLoaded || !current.hasMore) return;

    emit(AttendanceHistoryLoadingMore(
      records: current.records,
      hasMore: current.hasMore,
      currentPage: current.currentPage,
    ));

    try {
      final nextPage = current.currentPage + 1;
      final more = await _repo.getAttendanceHistory(page: nextPage);
      emit(AttendanceHistoryLoaded(
        records: [...current.records, ...more],
        hasMore: more.length == 20,
        currentPage: nextPage,
      ));
    } catch (_) {
      emit(AttendanceHistoryLoaded(
        records: current.records,
        hasMore: current.hasMore,
        currentPage: current.currentPage,
      ));
    }
  }

  Future<void> _onCheckIn(
    AttendanceCheckIn event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceCheckInLoading());
    try {
      final attendance = await _repo.checkIn(
        latitude: event.latitude,
        longitude: event.longitude,
        selfie: event.selfie,
      );
      emit(AttendanceCheckInSuccess(attendance));
    } catch (e) {
      emit(AttendanceError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onCheckOut(
    AttendanceCheckOut event,
    Emitter<AttendanceState> emit,
  ) async {
    emit(AttendanceCheckOutLoading());
    try {
      final attendance = await _repo.checkOut(
        latitude: event.latitude,
        longitude: event.longitude,
      );
      emit(AttendanceCheckOutSuccess(attendance));
    } catch (e) {
      emit(AttendanceError(e.toString().replaceAll('Exception: ', '')));
    }
  }
}
