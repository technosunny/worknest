import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants/app_constants.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/profile_repository.dart';
import 'auth_event.dart';
import 'auth_state.dart';

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepo = AuthRepository();
  final ProfileRepository _profileRepo = ProfileRepository();

  AuthBloc() : super(AuthInitial()) {
    on<AuthCheckRequested>(_onCheckRequested);
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthLogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onCheckRequested(
    AuthCheckRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final isLoggedIn = await _authRepo.isLoggedIn().timeout(
        const Duration(seconds: 5),
        onTimeout: () => false,
      );
      if (!isLoggedIn) {
        emit(AuthUnauthenticated());
        return;
      }
      try {
        final user = await _profileRepo.getProfile();
        await _authRepo.saveUserLocally(user);
        emit(AuthAuthenticated(user));
      } catch (_) {
        final cached = await _authRepo.getCachedUser();
        if (cached != null) {
          emit(AuthAuthenticated(cached));
        } else {
          emit(AuthUnauthenticated());
        }
      }
    } catch (_) {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLoginRequested(
    AuthLoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final auth = await _authRepo.login(event.email, event.password);
      if (event.rememberMe) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setBool(AppConstants.rememberMeKey, true);
        await prefs.setString(AppConstants.savedEmailKey, event.email);
      }
      await _authRepo.saveUserLocally(auth.user);
      emit(AuthAuthenticated(auth.user));
    } catch (e) {
      emit(AuthError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onLogoutRequested(
    AuthLogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    await _authRepo.logout();
    emit(AuthUnauthenticated());
  }
}
