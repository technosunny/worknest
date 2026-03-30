import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../bloc/attendance/attendance_bloc.dart';
import '../../bloc/attendance/attendance_event.dart';
import '../../bloc/attendance/attendance_state.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_state.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/date_utils.dart';
import '../../data/models/attendance_model.dart';
import '../../widgets/check_in_button.dart';
import '../../widgets/stat_card.dart';
import '../check_in/check_in_screen.dart';
import 'checkout_bottom_sheet.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Timer? _timer;
  int _elapsedSeconds = 0;

  @override
  void initState() {
    super.initState();
    context.read<AttendanceBloc>().add(AttendanceLoadToday());
    _requestPermissions();
  }

  Future<void> _requestPermissions() async {
    final cameraStatus = await Permission.camera.status;
    final locationStatus = await Permission.location.status;

    if (!cameraStatus.isGranted) {
      await Permission.camera.request();
    }
    if (!locationStatus.isGranted) {
      await Permission.location.request();
    }
  }

  void _startTimer(DateTime checkInTime) {
    _timer?.cancel();
    _elapsedSeconds = DateTime.now().difference(checkInTime).inSeconds;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _elapsedSeconds++);
    });
  }

  void _stopTimer() {
    _timer?.cancel();
    _timer = null;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _timerText {
    final h = _elapsedSeconds ~/ 3600;
    final m = (_elapsedSeconds % 3600) ~/ 60;
    final s = _elapsedSeconds % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Future<void> _onCheckInPressed() async {
    final result = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const CheckInScreen()),
    );
    if (result == true) {
      context.read<AttendanceBloc>().add(AttendanceLoadToday());
    }
  }

  void _onCheckOutPressed(AttendanceModel today) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => BlocProvider.value(
        value: context.read<AttendanceBloc>(),
        child: CheckoutBottomSheet(attendance: today),
      ),
    ).then((_) {
      context.read<AttendanceBloc>().add(AttendanceLoadToday());
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: BlocConsumer<AttendanceBloc, AttendanceState>(
        listener: (context, state) {
          if (state is AttendanceTodayLoaded) {
            if (state.today?.isActive == true) {
              _startTimer(state.today!.checkInTime!);
            } else {
              _stopTimer();
            }
          }
        },
        builder: (context, state) {
          AttendanceModel? today;
          if (state is AttendanceTodayLoaded) today = state.today;
          final isLoading = state is AttendanceLoading;

          return RefreshIndicator(
            onRefresh: () async {
              context.read<AttendanceBloc>().add(AttendanceLoadToday());
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildHeader(context),
                      const SizedBox(height: 20),
                      _buildStatusCard(today, isLoading),
                      const SizedBox(height: 32),
                      _buildCheckInButton(today, isLoading),
                      const SizedBox(height: 32),
                      _buildStatsRow(today),
                      const SizedBox(height: 100),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        final name = state is AuthAuthenticated ? state.user.name : '';
        final parts = name.split(' ');
        final greeting = _greeting();

        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  greeting,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textSecondary,
                    fontWeight: FontWeight.w400,
                  ),
                ),
                Text(
                  parts.isNotEmpty ? parts.first : name,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
            if (state is AuthAuthenticated)
              CircleAvatar(
                radius: 22,
                backgroundColor: AppTheme.primaryLight,
                backgroundImage:
                    state.user.avatar != null && state.user.avatar!.isNotEmpty
                        ? NetworkImage(state.user.avatar!)
                        : null,
                child: (state.user.avatar == null || state.user.avatar!.isEmpty)
                    ? Text(
                        state.user.initials,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.primary,
                        ),
                      )
                    : null,
              ),
          ],
        );
      },
    );
  }

  String _greeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }

  Widget _buildStatusCard(AttendanceModel? today, bool isLoading) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppTheme.primary, AppTheme.primaryDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withOpacity(0.3),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                AppDateUtils.formatDayDate(DateTime.now()),
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 13,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _getStatusLabel(today),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (isLoading)
            const Center(
              child: CircularProgressIndicator(color: Colors.white54, strokeWidth: 2),
            )
          else if (today?.isActive == true)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Time Elapsed',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 4),
                Text(
                  _timerText,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 36,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 2,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Checked in at ${AppDateUtils.formatTime(today!.checkInTime!)}',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            )
          else if (today?.isCheckedOut == true)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Today\'s Hours',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 4),
                Text(
                  today!.hoursWorked != null
                      ? AppDateUtils.formatHoursWorked(today.hoursWorked!)
                      : AppDateUtils.formatDuration(today.currentDuration),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 36,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${AppDateUtils.formatTime(today.checkInTime!)} — ${AppDateUtils.formatTime(today.checkOutTime!)}',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            )
          else
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Not checked in yet',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'Start your workday by checking in',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
        ],
      ),
    );
  }

  String _getStatusLabel(AttendanceModel? today) {
    if (today == null) return 'No Check-in';
    if (today.isActive) return 'Active';
    if (today.isCheckedOut) return 'Completed';
    return 'Checked In';
  }

  Widget _buildCheckInButton(AttendanceModel? today, bool isLoading) {
    final isCheckedIn = today != null && today.isCheckedIn && !today.isCheckedOut;
    return Center(
      child: CheckInButton(
        isCheckedIn: isCheckedIn,
        isLoading: isLoading,
        onPressed: () {
          final t = today;
          if (isCheckedIn && t != null) {
            _onCheckOutPressed(t);
          } else {
            _onCheckInPressed();
          }
        },
      ),
    );
  }

  Widget _buildStatsRow(AttendanceModel? today) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Today\'s Summary',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: StatCard(
                title: 'Check In',
                value: today?.checkInTime != null
                    ? AppDateUtils.formatTime(today!.checkInTime!)
                    : '—',
                icon: Icons.login_rounded,
                iconColor: AppTheme.success,
                iconBg: AppTheme.successLight,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: StatCard(
                title: 'Check Out',
                value: today?.checkOutTime != null
                    ? AppDateUtils.formatTime(today!.checkOutTime!)
                    : '—',
                icon: Icons.logout_rounded,
                iconColor: AppTheme.error,
                iconBg: AppTheme.errorLight,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
