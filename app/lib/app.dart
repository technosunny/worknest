import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'bloc/auth/auth_bloc.dart';
import 'bloc/auth/auth_event.dart';
import 'bloc/auth/auth_state.dart';
import 'core/theme/app_theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/main_screen.dart';

class HR360FlowApp extends StatelessWidget {
  const HR360FlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => AuthBloc()..add(AuthCheckRequested()),
      child: MaterialApp(
        title: 'HR360Flow',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.theme,
        home: const _AuthGate(),
      ),
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is AuthLoading || state is AuthInitial) {
          return const _SplashScreen();
        }
        if (state is AuthAuthenticated) {
          return const MainScreen();
        }
        return const LoginScreen();
      },
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.circular(22),
              ),
              child: const Icon(Icons.work_rounded, color: Colors.white, size: 44),
            ),
            const SizedBox(height: 24),
            const Text(
              'HR360Flow',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w700,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'HR Management',
              style: TextStyle(fontSize: 15, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 48),
            const CircularProgressIndicator(
              color: AppTheme.primary,
              strokeWidth: 2,
            ),
          ],
        ),
      ),
    );
  }
}
