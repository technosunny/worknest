import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
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
  CameraController? _cameraController;
  bool _cameraInitialized = false;
  File? _capturedImage;
  Position? _position;
  bool _isGettingLocation = false;
  String? _locationError;
  String? _cameraError;
  bool _cameraDenied = false;
  bool _locationDenied = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
    _getLocation();
  }

  Future<void> _initCamera() async {
    // Check existing permission first — don't re-request if already granted/denied
    final status = await Permission.camera.status;
    if (status.isPermanentlyDenied) {
      setState(() {
        _cameraDenied = true;
        _cameraError = 'Camera permission permanently denied. Please enable it in Settings.';
      });
      return;
    }
    if (status.isDenied) {
      setState(() {
        _cameraDenied = true;
        _cameraError = 'Camera permission denied. Enable it in Settings to take a selfie.';
      });
      return;
    }

    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _cameraError = 'No cameras available on this device');
        return;
      }
      final frontCamera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );
      await _startCamera(frontCamera);
    } catch (e) {
      setState(() => _cameraError = 'Camera error: $e');
    }
  }

  Future<void> _startCamera(CameraDescription camera) async {
    _cameraController?.dispose();
    _cameraController = CameraController(
      camera,
      ResolutionPreset.medium,
      enableAudio: false,
    );
    try {
      await _cameraController!.initialize();
      if (mounted) {
        setState(() {
          _cameraInitialized = true;
          _cameraError = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _cameraError = 'Failed to start camera: $e');
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
        setState(() {
          _locationError = 'Location services are disabled. Please enable GPS.';
          _isGettingLocation = false;
        });
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.deniedForever) {
        setState(() {
          _locationDenied = true;
          _locationError = 'Location permission permanently denied. Please enable in Settings.';
          _isGettingLocation = false;
        });
        return;
      }
      if (permission == LocationPermission.denied) {
        // Only request if not already asked on home screen
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied ||
            permission == LocationPermission.deniedForever) {
          setState(() {
            _locationDenied = permission == LocationPermission.deniedForever;
            _locationError = 'Location permission denied';
            _isGettingLocation = false;
          });
          return;
        }
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      setState(() => _position = position);
    } catch (e) {
      setState(() => _locationError = 'Failed to get location: $e');
    } finally {
      if (mounted) setState(() => _isGettingLocation = false);
    }
  }

  Future<void> _takeSelfie() async {
    if (_cameraController == null || !_cameraInitialized) return;
    try {
      final xFile = await _cameraController!.takePicture();
      setState(() => _capturedImage = File(xFile.path));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to take photo: $e')),
        );
      }
    }
  }

  Future<void> _pickFromGallery() async {
    final picker = ImagePicker();
    final xFile = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );
    if (xFile != null) {
      setState(() => _capturedImage = File(xFile.path));
    }
  }

  void _retakeSelfie() {
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
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AttendanceBloc, AttendanceState>(
      listener: (context, state) {
        if (state is AttendanceCheckInSuccess) {
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
        backgroundColor: Colors.black,
        appBar: AppBar(
          backgroundColor: Colors.black,
          iconTheme: const IconThemeData(color: Colors.white),
          title: const Text(
            'Check In',
            style: TextStyle(color: Colors.white),
          ),
        ),
        body: Column(
          children: [
            Expanded(child: _buildCameraView()),
            _buildBottomPanel(),
          ],
        ),
      ),
    );
  }

  Widget _buildCameraView() {
    if (_capturedImage != null) {
      return Stack(
        fit: StackFit.expand,
        children: [
          Image.file(_capturedImage!, fit: BoxFit.cover),
          Positioned(
            top: 16,
            right: 16,
            child: GestureDetector(
              onTap: _retakeSelfie,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.refresh, color: Colors.white, size: 16),
                    SizedBox(width: 4),
                    Text('Retake', style: TextStyle(color: Colors.white, fontSize: 13)),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    if (_cameraError != null || _cameraDenied) {
      return Container(
        color: Colors.black,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.no_photography_outlined, color: Colors.white54, size: 56),
                const SizedBox(height: 16),
                Text(
                  _cameraError ?? 'Camera unavailable',
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                if (_cameraDenied) ...[
                  OutlinedButton.icon(
                    onPressed: openAppSettings,
                    icon: const Icon(Icons.settings_outlined, color: Colors.white70),
                    label: const Text('Open Settings', style: TextStyle(color: Colors.white70)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.white38),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                OutlinedButton.icon(
                  onPressed: _pickFromGallery,
                  icon: const Icon(Icons.photo_library_outlined, color: Colors.white70),
                  label: const Text('Pick from Gallery', style: TextStyle(color: Colors.white70)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.white38),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!_cameraInitialized) {
      return Container(
        color: Colors.black,
        child: const Center(
          child: CircularProgressIndicator(color: Colors.white),
        ),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        // Explicit black background so there's never a grey flash
        Container(color: Colors.black),
        // Fill the available space with the camera preview
        FittedBox(
          fit: BoxFit.cover,
          child: SizedBox(
            width: _cameraController!.value.previewSize?.height ?? 1,
            height: _cameraController!.value.previewSize?.width ?? 1,
            child: CameraPreview(_cameraController!),
          ),
        ),
        // Face guide overlay
        Center(
          child: Container(
            width: 220,
            height: 260,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white54, width: 2),
              borderRadius: BorderRadius.circular(120),
            ),
          ),
        ),
        Positioned(
          bottom: 16,
          left: 0,
          right: 0,
          child: Center(
            child: Text(
              'Position your face within the oval',
              style: TextStyle(
                color: Colors.white.withOpacity(0.8),
                fontSize: 13,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBottomPanel() {
    return BlocBuilder<AttendanceBloc, AttendanceState>(
      builder: (context, state) {
        final isSubmitting = state is AttendanceCheckInLoading;

        return Container(
          color: Colors.white,
          padding: const EdgeInsets.all(20),
          child: SafeArea(
            top: false,
            child: Column(
              children: [
                _buildLocationStatus(),
                const SizedBox(height: 16),
                if (_capturedImage == null)
                  _buildCaptureButtons()
                else
                  _buildSubmitButton(isSubmitting),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildLocationStatus() {
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: _position != null
                ? AppTheme.successLight
                : _locationError != null
                    ? AppTheme.errorLight
                    : AppTheme.primaryLight,
            borderRadius: BorderRadius.circular(8),
          ),
          child: _isGettingLocation
              ? const Padding(
                  padding: EdgeInsets.all(8),
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Icon(
                  _position != null
                      ? Icons.location_on_rounded
                      : Icons.location_off_rounded,
                  size: 18,
                  color: _position != null
                      ? AppTheme.success
                      : _locationError != null
                          ? AppTheme.error
                          : AppTheme.primary,
                ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _position != null
                    ? 'Location captured'
                    : _locationError ?? 'Getting location...',
                style: TextStyle(
                  fontSize: 13,
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
                  style: const TextStyle(fontSize: 11, color: AppTheme.textLight),
                ),
            ],
          ),
        ),
        if (_locationError != null && !_locationDenied)
          TextButton(
            onPressed: _getLocation,
            child: const Text('Retry'),
          ),
        if (_locationDenied)
          TextButton(
            onPressed: openAppSettings,
            child: const Text('Settings'),
          ),
      ],
    );
  }

  Widget _buildCaptureButtons() {
    final canCapture = _cameraInitialized && _cameraError == null;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (canCapture)
          GestureDetector(
            onTap: _takeSelfie,
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.primary, width: 3),
              ),
              child: Center(
                child: Container(
                  width: 58,
                  height: 58,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppTheme.primary,
                  ),
                  child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 28),
                ),
              ),
            ),
          ),
        if (canCapture) const SizedBox(width: 20),
        IconButton(
          onPressed: _pickFromGallery,
          icon: const Icon(Icons.photo_library_outlined),
          tooltip: 'Pick from gallery',
          color: AppTheme.textSecondary,
          iconSize: 28,
        ),
      ],
    );
  }

  Widget _buildSubmitButton(bool isLoading) {
    final canSubmit = _position != null && !isLoading;
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: canSubmit ? _submit : null,
        icon: isLoading
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
              )
            : const Icon(Icons.check_rounded),
        label: Text(isLoading ? 'Checking in...' : 'Submit Check In'),
      ),
    );
  }
}
