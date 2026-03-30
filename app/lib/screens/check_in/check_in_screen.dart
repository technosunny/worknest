import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../../bloc/attendance/attendance_bloc.dart';
import '../../bloc/attendance/attendance_event.dart';
import '../../bloc/attendance/attendance_state.dart';
import '../../core/theme/app_theme.dart';

class CheckInScreen extends StatefulWidget {
  const CheckInScreen({super.key});

  @override
  State<CheckInScreen> createState() => _CheckInScreenState();
}

class _CheckInScreenState extends State<CheckInScreen> {
  File? _capturedImage;
  Position? _position;
  bool _isGettingLocation = false;
  String? _locationError;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _getLocation();
    // Auto-open camera on start
    WidgetsBinding.instance.addPostFrameCallback((_) => _takeSelfie());
  }

  Future<void> _getLocation() async {
    setState(() {
      _isGettingLocation = true;
      _locationError = null;
    });
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() => _locationError = 'Location services are disabled');
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() => _locationError = 'Location permission denied');
          return;
        }
      }
      if (permission == LocationPermission.deniedForever) {
        setState(() => _locationError = 'Location permission permanently denied. Go to Settings to enable.');
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      setState(() => _position = position);
    } catch (e) {
      setState(() => _locationError = 'Failed to get location');
    } finally {
      setState(() => _isGettingLocation = false);
    }
  }

  Future<void> _takeSelfie() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 80,
      );
      if (photo != null) {
        setState(() => _capturedImage = File(photo.path));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Camera error: $e'),
            backgroundColor: AppTheme.error,
          ),
        );
      }
    }
  }

  void _submit() {
    if (_position == null || _capturedImage == null) return;
    context.read<AttendanceBloc>().add(AttendanceCheckIn(
          latitude: _position!.latitude,
          longitude: _position!.longitude,
          selfie: _capturedImage!,
        ));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AttendanceBloc, AttendanceState>(
      listener: (context, state) {
        if (state is AttendanceCheckInSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Checked in successfully!'),
              backgroundColor: AppTheme.success,
            ),
          );
          Navigator.pop(context, true);
        } else if (state is AttendanceError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppTheme.error,
            ),
          );
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          title: const Text(
            'Check In',
            style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600),
          ),
          iconTheme: const IconThemeData(color: AppTheme.textPrimary),
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Selfie preview
                Expanded(
                  child: _buildSelfieSection(),
                ),
                const SizedBox(height: 20),
                // Location status
                _buildLocationStatus(),
                const SizedBox(height: 20),
                // Submit button
                _buildSubmitButton(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSelfieSection() {
    if (_capturedImage != null) {
      return Stack(
        children: [
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppTheme.border),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Image.file(_capturedImage!, fit: BoxFit.cover),
            ),
          ),
          Positioned(
            top: 12,
            right: 12,
            child: GestureDetector(
              onTap: _takeSelfie,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.refresh_rounded, color: Colors.white, size: 16),
                    SizedBox(width: 6),
                    Text('Retake', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    // No photo yet
    return GestureDetector(
      onTap: _takeSelfie,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: AppTheme.background,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.border, width: 2, style: BorderStyle.solid),
        ),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.camera_alt_rounded, size: 56, color: AppTheme.textLight),
            SizedBox(height: 12),
            Text(
              'Tap to take selfie',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppTheme.textSecondary),
            ),
            SizedBox(height: 4),
            Text(
              'Required for check-in',
              style: TextStyle(fontSize: 13, color: AppTheme.textLight),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationStatus() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: _position != null
                  ? AppTheme.successLight
                  : _locationError != null
                      ? AppTheme.errorLight
                      : AppTheme.primaryLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: _isGettingLocation
                ? const Padding(
                    padding: EdgeInsets.all(10),
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                  )
                : Icon(
                    _position != null ? Icons.location_on_rounded : Icons.location_off_rounded,
                    size: 20,
                    color: _position != null
                        ? AppTheme.success
                        : _locationError != null
                            ? AppTheme.error
                            : AppTheme.primary,
                  ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _position != null
                      ? 'Location captured'
                      : _locationError ?? 'Getting location...',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: _position != null
                        ? AppTheme.success
                        : _locationError != null
                            ? AppTheme.error
                            : AppTheme.textSecondary,
                  ),
                ),
                if (_position != null)
                  Text(
                    '${_position!.latitude.toStringAsFixed(4)}, ${_position!.longitude.toStringAsFixed(4)}',
                    style: const TextStyle(fontSize: 12, color: AppTheme.textLight),
                  ),
              ],
            ),
          ),
          if (_locationError != null)
            TextButton(
              onPressed: _getLocation,
              child: const Text('Retry'),
            ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton() {
    return BlocBuilder<AttendanceBloc, AttendanceState>(
      builder: (context, state) {
        final isSubmitting = state is AttendanceCheckInLoading;
        final canSubmit = _position != null && _capturedImage != null && !isSubmitting;

        return SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: canSubmit ? _submit : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primary,
              foregroundColor: Colors.white,
              disabledBackgroundColor: AppTheme.border,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: isSubmitting
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle_outline_rounded, size: 20),
                      SizedBox(width: 8),
                      Text('Submit Check In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    ],
                  ),
          ),
        );
      },
    );
  }
}
