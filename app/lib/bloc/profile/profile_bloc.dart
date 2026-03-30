import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/repositories/profile_repository.dart';
import 'profile_event.dart';
import 'profile_state.dart';

class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  final ProfileRepository _repo = ProfileRepository();

  ProfileBloc() : super(ProfileInitial()) {
    on<ProfileLoadRequested>(_onLoadRequested);
    on<ProfileUpdateRequested>(_onUpdateRequested);
    on<ProfileChangePasswordRequested>(_onChangePasswordRequested);
  }

  Future<void> _onLoadRequested(
    ProfileLoadRequested event,
    Emitter<ProfileState> emit,
  ) async {
    emit(ProfileLoading());
    try {
      final user = await _repo.getProfile();
      emit(ProfileLoaded(user));
    } catch (e) {
      emit(ProfileError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onUpdateRequested(
    ProfileUpdateRequested event,
    Emitter<ProfileState> emit,
  ) async {
    emit(ProfileActionLoading());
    try {
      final user = await _repo.updateProfile(
        firstName: event.firstName,
        lastName: event.lastName,
        phone: event.phone,
      );
      emit(ProfileUpdateSuccess(user));
    } catch (e) {
      emit(ProfileActionError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onChangePasswordRequested(
    ProfileChangePasswordRequested event,
    Emitter<ProfileState> emit,
  ) async {
    emit(ProfileActionLoading());
    try {
      await _repo.changePassword(
        currentPassword: event.currentPassword,
        newPassword: event.newPassword,
      );
      emit(ProfilePasswordChanged());
    } catch (e) {
      emit(ProfileActionError(e.toString().replaceAll('Exception: ', '')));
    }
  }
}
