import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../core/utils/date_utils.dart';
import '../data/models/attendance_model.dart';
import 'attendance_status_chip.dart';

class AttendanceCard extends StatelessWidget {
  final AttendanceModel attendance;

  const AttendanceCard({super.key, required this.attendance});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                AppDateUtils.formatDate(attendance.date),
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: AppTheme.textPrimary,
                ),
              ),
              AttendanceStatusChip(status: attendance.status),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _TimeColumn(
                  label: 'Check In',
                  time: attendance.checkInTime != null
                      ? AppDateUtils.formatTime(attendance.checkInTime!)
                      : '—',
                  icon: Icons.login_rounded,
                  color: AppTheme.success,
                ),
              ),
              Container(
                width: 1,
                height: 40,
                color: AppTheme.border,
              ),
              Expanded(
                child: _TimeColumn(
                  label: 'Check Out',
                  time: attendance.checkOutTime != null
                      ? AppDateUtils.formatTime(attendance.checkOutTime!)
                      : '—',
                  icon: Icons.logout_rounded,
                  color: AppTheme.error,
                ),
              ),
              Container(
                width: 1,
                height: 40,
                color: AppTheme.border,
              ),
              Expanded(
                child: _TimeColumn(
                  label: 'Hours',
                  time: attendance.hoursWorked != null
                      ? AppDateUtils.formatHoursWorked(attendance.hoursWorked!)
                      : attendance.checkInTime != null
                          ? AppDateUtils.formatDuration(attendance.currentDuration)
                          : '—',
                  icon: Icons.schedule_rounded,
                  color: AppTheme.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TimeColumn extends StatelessWidget {
  final String label;
  final String time;
  final IconData icon;
  final Color color;

  const _TimeColumn({
    required this.label,
    required this.time,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(height: 4),
        Text(
          time,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11,
            color: AppTheme.textSecondary,
          ),
        ),
      ],
    );
  }
}
