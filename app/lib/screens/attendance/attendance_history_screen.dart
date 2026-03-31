import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../bloc/attendance/attendance_bloc.dart';
import '../../bloc/attendance/attendance_event.dart';
import '../../bloc/attendance/attendance_state.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/date_utils.dart';
import '../../data/models/attendance_model.dart';
import '../../widgets/attendance_card.dart';

class AttendanceHistoryScreen extends StatefulWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  State<AttendanceHistoryScreen> createState() =>
      _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen>
    with AutomaticKeepAliveClientMixin {
  final ScrollController _scrollController = ScrollController();

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      final state = context.read<AttendanceBloc>().state;
      if (state is AttendanceHistoryLoaded &&
          state.hasMore &&
          state is! AttendanceHistoryLoadingMore) {
        context.read<AttendanceBloc>().add(AttendanceLoadMoreHistory());
      }
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Attendance History'),
        backgroundColor: Colors.white,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: AppTheme.border),
        ),
      ),
      body: BlocBuilder<AttendanceBloc, AttendanceState>(
        builder: (context, state) {
          if (state is AttendanceLoading) {
            return const Center(
              child: CircularProgressIndicator(color: AppTheme.primary),
            );
          }

          if (state is AttendanceError) {
            return _buildError(state.message);
          }

          if (state is AttendanceHistoryLoaded ||
              state is AttendanceHistoryLoadingMore) {
            final loaded = state as AttendanceHistoryLoaded;
            if (loaded.records.isEmpty) {
              return _buildEmpty();
            }
            return _buildList(loaded);
          }

          return const SizedBox();
        },
      ),
    );
  }

  Widget _buildList(AttendanceHistoryLoaded state) {
    final grouped = _groupByMonth(state.records);
    final months = grouped.keys.toList()..sort((a, b) => b.compareTo(a));

    return RefreshIndicator(
      onRefresh: () async {
        context.read<AttendanceBloc>().add(AttendanceLoadHistory(refresh: true));
      },
      child: CustomScrollView(
        controller: _scrollController,
        slivers: [
          SliverToBoxAdapter(child: _buildMonthlySummary(state.records)),
          for (final month in months) ...[
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
                child: Text(
                  month,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) => AttendanceCard(
                    attendance: grouped[month]![index],
                  ),
                  childCount: grouped[month]!.length,
                ),
              ),
            ),
          ],
          if (state is AttendanceHistoryLoadingMore)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Center(
                  child: CircularProgressIndicator(color: AppTheme.primary),
                ),
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }

  Map<String, List<AttendanceModel>> _groupByMonth(
      List<AttendanceModel> records) {
    final map = <String, List<AttendanceModel>>{};
    for (final r in records) {
      final key = DateFormat('MMMM yyyy').format(r.date);
      map.putIfAbsent(key, () => []).add(r);
    }
    return map;
  }

  Widget _buildMonthlySummary(List<AttendanceModel> records) {
    final now = DateTime.now();
    final thisMonth = records.where((r) =>
        r.date.year == now.year && r.date.month == now.month).toList();

    final present = thisMonth.where((r) =>
        r.status == AttendanceStatus.present ||
        r.status == AttendanceStatus.late).length;
    final totalHours = thisMonth.fold<double>(
        0, (sum, r) => sum + (r.hoursWorked ?? r.currentDuration.inMinutes / 60));

    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppDateUtils.formatMonthYear(now),
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _SummaryTile(
                  label: 'Days Present',
                  value: present.toString(),
                  color: AppTheme.success,
                ),
              ),
              Expanded(
                child: _SummaryTile(
                  label: 'Total Hours',
                  value: AppDateUtils.formatHoursWorked(totalHours),
                  color: AppTheme.primary,
                ),
              ),
              Expanded(
                child: _SummaryTile(
                  label: 'This Month',
                  value: '${thisMonth.length} days',
                  color: AppTheme.warning,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildError(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AppTheme.textLight),
          const SizedBox(height: 16),
          Text(message, style: const TextStyle(color: AppTheme.textSecondary)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => context
                .read<AttendanceBloc>()
                .add(AttendanceLoadHistory()),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.calendar_today_outlined, size: 48, color: AppTheme.textLight),
          SizedBox(height: 16),
          Text(
            'No attendance records yet',
            style: TextStyle(color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _SummaryTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _SummaryTile({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppTheme.textSecondary),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
