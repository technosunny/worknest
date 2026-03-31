import 'dart:typed_data';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../../bloc/attendance/attendance_bloc.dart';
import '../../bloc/attendance/attendance_event.dart';
import '../../bloc/attendance/attendance_state.dart';
import '../../core/theme/app_theme.dart';
import 'camera_service.dart';

class CheckInScreen extends StatefulWidget {
  const CheckInScreen({super.key});

  @override
  State<CheckInScreen> createState() => _CheckInScreenState();
}

class _CheckInScreenState extends State<CheckInScreen> {
  Uint8List? _capturedBytes;
  Position? _position;
  bool _isGettingLocation = false;
  String? _locationError;
  String? _cameraViewId;
  bool _cameraFailed = false;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _getLocation();
    if (kIsWeb) _initCamera();
  }

  @override
  void dispose() {
    if (kIsWeb) disposeWebCamera();
    super.dispose();
  }

  Future<void> _initCamera() async {
    final viewId = await initWebCamera();
    if (mounted) {
      setState(() {
        _cameraViewId = viewId;
        _cameraFailed = viewId == null;
      });
    }
  }

  Future<void> _getLocation() async {
    setState(() {
      _isGettingLocation = true;
      _locationError = null;
    });
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() => _locationError = 'Enable location services');
        return;
      }
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
        if (perm == LocationPermission.denied) {
          setState(() => _locationError = 'Location permission denied');
          return;
        }
      }
      if (perm == LocationPermission.deniedForever) {
        setState(() => _locationError = 'Location permanently denied');
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (mounted) setState(() => _position = pos);
    } catch (_) {
      if (mounted) setState(() => _locationError = 'Failed to get location');
    } finally {
      if (mounted) setState(() => _isGettingLocation = false);
    }
  }

  Future<void> _captureFromWebCamera() async {
    final bytes = await captureWebFrame();
    if (bytes != null && mounted) {
      setState(() => _capturedBytes = bytes);
    }
  }

  Future<void> _pickFromGallery() async {
    try {
      final XFile? photo = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        maxWidth: 800,
        maxHeight: 800,
        imageQuality: 85,
      );
      if (photo != null && mounted) {
        final bytes = await photo.readAsBytes();
        setState(() => _capturedBytes = bytes);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Camera error: $e'), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  void _retake() {
    setState(() => _capturedBytes = null);
    if (kIsWeb && _cameraViewId == null) _initCamera();
  }

  void _submit() {
    if (_position == null || _capturedBytes == null) return;
    context.read<AttendanceBloc>().add(AttendanceCheckIn(
          latitude: _position!.latitude,
          longitude: _position!.longitude,
          selfieBytes: _capturedBytes!,
        ));
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AttendanceBloc, AttendanceState>(
      listener: (context, state) {
        if (state is AttendanceCheckInSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Checked in successfully!'), backgroundColor: AppTheme.success),
          );
          Navigator.pop(context, true);
        } else if (state is AttendanceError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message), backgroundColor: AppTheme.error),
          );
        }
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          title: const Text('Check In', style: TextStyle(color: AppTheme.textPrimary, fontWeight: FontWeight.w600)),
          iconTheme: const IconThemeData(color: AppTheme.textPrimary),
        ),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Expanded(child: _buildSelfieSection()),
                const SizedBox(height: 20),
                _buildLocationStatus(),
                const SizedBox(height: 20),
                _buildActionButton(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSelfieSection() {
    // Show captured image
    if (_capturedBytes != null) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppTheme.success, width: 3),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.success.withAlpha(60),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: ClipOval(
              child: SizedBox(
                width: 250,
                height: 250,
                child: Image.memory(_capturedBytes!, fit: BoxFit.cover),
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 18),
              SizedBox(width: 6),
              Text('Selfie captured', style: TextStyle(color: AppTheme.success, fontWeight: FontWeight.w500)),
            ],
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: _retake,
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('Retake'),
            style: TextButton.styleFrom(foregroundColor: AppTheme.textSecondary),
          ),
        ],
      );
    }

    // Web: show live camera preview in circle
    if (kIsWeb && _cameraViewId != null) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppTheme.primary, width: 3),
              boxShadow: [
                BoxShadow(
                  color: AppTheme.primary.withAlpha(40),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: buildWebCameraPreview(250, _cameraViewId!),
          ),
          const SizedBox(height: 12),
          const Text(
            'Position your face in the circle',
            style: TextStyle(fontSize: 14, color: AppTheme.textSecondary),
          ),
        ],
      );
    }

    // Web camera loading
    if (kIsWeb && !_cameraFailed) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 250,
            height: 250,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.background,
              border: Border.all(color: AppTheme.border, width: 3),
            ),
            child: const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(color: AppTheme.primary, strokeWidth: 2),
                  SizedBox(height: 12),
                  Text('Starting camera...', style: TextStyle(fontSize: 13, color: AppTheme.textLight)),
                ],
              ),
            ),
          ),
        ],
      );
    }

    // Mobile or camera failed: show tap-to-capture placeholder
    return GestureDetector(
      onTap: _pickFromGallery,
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: AppTheme.background,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.border, width: 2),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.primaryLight,
                border: Border.all(color: AppTheme.primary.withAlpha(80), width: 3),
              ),
              child: const Icon(Icons.camera_alt_rounded, size: 44, color: AppTheme.primary),
            ),
            const SizedBox(height: 16),
            const Text('Tap to take selfie', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: AppTheme.textPrimary)),
            const SizedBox(height: 4),
            const Text('Opens your camera for a quick selfie', style: TextStyle(fontSize: 13, color: AppTheme.textLight)),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationStatus() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        children: [
          Icon(
            _position != null ? Icons.check_circle_rounded : _isGettingLocation ? Icons.location_searching_rounded : Icons.location_off_rounded,
            size: 20,
            color: _position != null ? AppTheme.success : _locationError != null ? AppTheme.error : AppTheme.textLight,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _position != null
                  ? 'Location: ${_position!.latitude.toStringAsFixed(4)}, ${_position!.longitude.toStringAsFixed(4)}'
                  : _locationError ?? 'Getting location...',
              style: TextStyle(
                fontSize: 13,
                color: _position != null ? AppTheme.success : _locationError != null ? AppTheme.error : AppTheme.textSecondary,
              ),
            ),
          ),
          if (_locationError != null)
            GestureDetector(
              onTap: _getLocation,
              child: const Text('Retry', style: TextStyle(color: AppTheme.primary, fontSize: 13, fontWeight: FontWeight.w500)),
            ),
        ],
      ),
    );
  }

  Widget _buildActionButton() {
    return BlocBuilder<AttendanceBloc, AttendanceState>(
      builder: (context, state) {
        final isSubmitting = state is AttendanceCheckInLoading;

        // Web with live camera: show capture button
        if (kIsWeb && _cameraViewId != null && _capturedBytes == null) {
          return SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _captureFromWebCamera,
              icon: const Icon(Icons.camera_rounded, size: 22),
              label: const Text('Capture Selfie', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
            ),
          );
        }

        // No selfie yet (mobile / camera failed)
        if (_capturedBytes == null) {
          return SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _pickFromGallery,
              icon: const Icon(Icons.camera_alt_rounded, size: 20),
              label: const Text('Take Selfie', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0,
              ),
            ),
          );
        }

        // Selfie captured: show submit
        final canSubmit = _position != null && !isSubmitting;
        return SizedBox(
          width: double.infinity,
          height: 52,
          child: ElevatedButton(
            onPressed: canSubmit ? _submit : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.success,
              foregroundColor: Colors.white,
              disabledBackgroundColor: AppTheme.border,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 0,
            ),
            child: isSubmitting
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
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
