import 'dart:io';
import 'package:camera/camera.dart';
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

class _CheckInScreenState extends State<CheckInScreen> with WidgetsBindingObserver {
  CameraController? _controller;
  bool _isCameraReady = false;
  bool _useFallback = false;
  File? _capturedImage;
  Position? _position;
  bool _isGettingLocation = false;
  String? _locationError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initCamera();
    _getLocation();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_controller == null || !_controller!.value.isInitialized) return;
    if (state == AppLifecycleState.inactive) {
      _controller?.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _initCamera();
    }
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _useFallback = true);
        return;
      }

      final front = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      _controller = CameraController(
        front,
        ResolutionPreset.medium,
        enableAudio: false,
      );

      await _controller!.initialize();
      if (mounted) {
        setState(() => _isCameraReady = true);
      }
    } catch (e) {
      debugPrint('Camera init failed: $e');
      if (mounted) {
        setState(() => _useFallback = true);
      }
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

  Future<void> _capture() async {
    if (_useFallback) {
      // Use system camera as fallback
      final picker = ImagePicker();
      final photo = await picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        maxWidth: 800,
        imageQuality: 85,
      );
      if (photo != null && mounted) {
        setState(() => _capturedImage = File(photo.path));
      }
      return;
    }

    if (_controller == null || !_controller!.value.isInitialized) return;
    try {
      final xFile = await _controller!.takePicture();
      if (mounted) setState(() => _capturedImage = File(xFile.path));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Capture failed: $e'), backgroundColor: AppTheme.error),
        );
      }
    }
  }

  void _retake() {
    setState(() => _capturedImage = null);
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
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    super.dispose();
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
        backgroundColor: Colors.black,
        body: SafeArea(
          child: Column(
            children: [
              // Top bar
              _buildTopBar(),
              // Camera / Preview
              Expanded(child: _buildCameraArea()),
              // Bottom controls
              _buildBottomPanel(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.white12,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 20),
            ),
          ),
          const SizedBox(width: 14),
          const Text(
            'Take Selfie',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const Spacer(),
          // Location indicator
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: _position != null ? Colors.green.withAlpha(40) : Colors.white12,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _position != null ? Icons.location_on_rounded : Icons.location_searching_rounded,
                  color: _position != null ? Colors.greenAccent : Colors.white54,
                  size: 14,
                ),
                const SizedBox(width: 4),
                Text(
                  _position != null ? 'GPS ✓' : _isGettingLocation ? '...' : '✗',
                  style: TextStyle(
                    color: _position != null ? Colors.greenAccent : Colors.white54,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCameraArea() {
    if (_capturedImage != null) {
      return _buildPreview();
    }

    if (_useFallback) {
      return _buildFallbackUI();
    }

    if (!_isCameraReady || _controller == null) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(color: Colors.white54, strokeWidth: 2),
            SizedBox(height: 16),
            Text('Initializing camera...', style: TextStyle(color: Colors.white54, fontSize: 14)),
          ],
        ),
      );
    }

    return _buildCameraPreview();
  }

  Widget _buildCameraPreview() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final circleSize = constraints.maxWidth * 0.75;

        return Stack(
          alignment: Alignment.center,
          children: [
            // Camera feed
            SizedBox(
              width: constraints.maxWidth,
              height: constraints.maxHeight,
              child: FittedBox(
                fit: BoxFit.cover,
                clipBehavior: Clip.hardEdge,
                child: SizedBox(
                  width: _controller!.value.previewSize?.height ?? 300,
                  height: _controller!.value.previewSize?.width ?? 400,
                  child: CameraPreview(_controller!),
                ),
              ),
            ),

            // Dark overlay with circular cutout
            ColorFiltered(
              colorFilter: const ColorFilter.mode(Colors.black54, BlendMode.srcOut),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Container(
                    decoration: const BoxDecoration(
                      color: Colors.black,
                      backgroundBlendMode: BlendMode.dstOut,
                    ),
                  ),
                  Center(
                    child: Container(
                      width: circleSize,
                      height: circleSize,
                      decoration: const BoxDecoration(
                        color: Colors.red, // Any color, gets cut out
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Circle border
            Center(
              child: Container(
                width: circleSize,
                height: circleSize,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white38, width: 3),
                ),
              ),
            ),

            // Guide text at bottom
            Positioned(
              bottom: 20,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black45,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'Position your face in the circle',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildPreview() {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Captured image
        SizedBox.expand(
          child: Image.file(_capturedImage!, fit: BoxFit.cover),
        ),
        // Retake button
        Positioned(
          top: 16,
          right: 16,
          child: GestureDetector(
            onTap: _retake,
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
        // Check mark
        Positioned(
          bottom: 20,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.green.withAlpha(150),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle_rounded, color: Colors.white, size: 16),
                SizedBox(width: 6),
                Text('Photo ready', style: TextStyle(color: Colors.white, fontSize: 13)),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFallbackUI() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.white12,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(Icons.camera_alt_rounded, color: Colors.white54, size: 40),
          ),
          const SizedBox(height: 20),
          const Text(
            'Camera not available',
            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          const Text(
            'Tap the button below to use system camera',
            style: TextStyle(color: Colors.white54, fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomPanel() {
    return BlocBuilder<AttendanceBloc, AttendanceState>(
      builder: (context, state) {
        final isSubmitting = state is AttendanceCheckInLoading;

        return Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Location status row
              _buildLocationRow(),
              const SizedBox(height: 16),
              // Action button
              if (_capturedImage == null)
                _buildCaptureButton()
              else
                _buildSubmitButton(isSubmitting),
            ],
          ),
        );
      },
    );
  }

  Widget _buildLocationRow() {
    return Row(
      children: [
        Icon(
          _position != null ? Icons.check_circle_rounded : Icons.radio_button_unchecked,
          size: 18,
          color: _position != null ? AppTheme.success : AppTheme.textLight,
        ),
        const SizedBox(width: 8),
        Text(
          _position != null
              ? 'Location: ${_position!.latitude.toStringAsFixed(4)}, ${_position!.longitude.toStringAsFixed(4)}'
              : _locationError ?? 'Getting location...',
          style: TextStyle(
            fontSize: 13,
            color: _position != null ? AppTheme.textSecondary : AppTheme.textLight,
          ),
        ),
        if (_locationError != null) ...[
          const Spacer(),
          GestureDetector(
            onTap: _getLocation,
            child: const Text('Retry', style: TextStyle(color: AppTheme.primary, fontSize: 13, fontWeight: FontWeight.w500)),
          ),
        ],
      ],
    );
  }

  Widget _buildCaptureButton() {
    return GestureDetector(
      onTap: _capture,
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: AppTheme.primary, width: 4),
        ),
        child: Container(
          margin: const EdgeInsets.all(4),
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: AppTheme.primary,
          ),
          child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 28),
        ),
      ),
    );
  }

  Widget _buildSubmitButton(bool isLoading) {
    final canSubmit = _position != null && !isLoading;
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
        child: isLoading
            ? const SizedBox(
                width: 22, height: 22,
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
  }
}
