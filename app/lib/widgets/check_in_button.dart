import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

class CheckInButton extends StatefulWidget {
  final bool isCheckedIn;
  final bool isLoading;
  final VoidCallback onPressed;

  const CheckInButton({
    super.key,
    required this.isCheckedIn,
    required this.isLoading,
    required this.onPressed,
  });

  @override
  State<CheckInButton> createState() => _CheckInButtonState();
}

class _CheckInButtonState extends State<CheckInButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    if (!widget.isCheckedIn) {
      _pulseController.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(CheckInButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isCheckedIn && !oldWidget.isCheckedIn) {
      _pulseController.stop();
      _pulseController.reset();
    } else if (!widget.isCheckedIn && oldWidget.isCheckedIn) {
      _pulseController.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isCheckIn = !widget.isCheckedIn;
    final color = isCheckIn ? AppTheme.primary : AppTheme.error;
    final label = isCheckIn ? 'Check In' : 'Check Out';
    final icon = isCheckIn ? Icons.login_rounded : Icons.logout_rounded;

    return Column(
      children: [
        AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Stack(
              alignment: Alignment.center,
              children: [
                if (isCheckIn && !widget.isLoading)
                  Transform.scale(
                    scale: _pulseAnimation.value,
                    child: Container(
                      width: 160,
                      height: 160,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: color.withOpacity(0.1),
                      ),
                    ),
                  ),
                if (isCheckIn && !widget.isLoading)
                  Transform.scale(
                    scale: _pulseAnimation.value * 0.9,
                    child: Container(
                      width: 145,
                      height: 145,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: color.withOpacity(0.15),
                      ),
                    ),
                  ),
                GestureDetector(
                  onTap: widget.isLoading ? null : widget.onPressed,
                  child: Container(
                    width: 130,
                    height: 130,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: color,
                      boxShadow: [
                        BoxShadow(
                          color: color.withOpacity(0.4),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: widget.isLoading
                        ? const Center(
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 3,
                            ),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(icon, color: Colors.white, size: 36),
                              const SizedBox(height: 6),
                              Text(
                                label,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 16),
        Text(
          isCheckIn ? 'Tap to check in' : 'Tap to check out',
          style: const TextStyle(
            fontSize: 13,
            color: AppTheme.textSecondary,
          ),
        ),
      ],
    );
  }
}
