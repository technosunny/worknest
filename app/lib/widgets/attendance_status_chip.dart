import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';
import '../data/models/attendance_model.dart';

class AttendanceStatusChip extends StatelessWidget {
  final AttendanceStatus status;

  const AttendanceStatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final config = _getConfig();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: config.$2,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        config.$1,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: config.$3,
        ),
      ),
    );
  }

  (String, Color, Color) _getConfig() {
    switch (status) {
      case AttendanceStatus.present:
        return ('Present', AppTheme.successLight, AppTheme.success);
      case AttendanceStatus.halfDay:
        return ('Half Day', AppTheme.warningLight, AppTheme.warning);
      case AttendanceStatus.absent:
        return ('Absent', AppTheme.errorLight, AppTheme.error);
      case AttendanceStatus.late:
        return ('Late', const Color(0xFFFFF7ED), const Color(0xFFEA580C));
      case AttendanceStatus.unknown:
        return ('—', AppTheme.border, AppTheme.textLight);
    }
  }
}
