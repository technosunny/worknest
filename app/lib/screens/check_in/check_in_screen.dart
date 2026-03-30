import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';
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
  bool _isFrontCamera = true;
  File? _capturedImage;
  Position? _position;
  bool _isGettingLocation = false;
  String? _locationError;
  String? _cameraError;
  List<CameraDescription> _cameras = [];

  @override
  void initState() {
    super.initState();
    _initCamera();
    _getLocation();
  }

  Future<void> _initCamera() async {
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      setState(() => _cameraError = 'Camera permission denied');
      return;
    }
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        setState(() => _cameraError = 'No cameras found');
        return;
      }
      final frontCamera = _cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras.first,
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
      if (mounted) setState(() => _cameraInitialized = true);
    } catch (e) {
      setState(() => _cameraError = 'Failed to initialize camera');
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
        setState(() => _locationError = 'Location permission permanently denied');
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      setState(() => _position = position);
    } catch (e) {
      setState(() => _locationError = 'Failed to get location: $e');
    } finally {
      setState(() => _isGettingLocation = false);
    }
  }

  Future<void> _takeSelfie() async {
    if (_cameraController == null || !_cameraInitialized) return;
    try {
      final xFile = await _cameraController!.takePicture();
      setState(() => _capturedImage = File(xFile.path));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to take photo: $e')),
      );
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

    if (_cameraError != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.no_photography, color: Colors.white54, size: 48),
            const SizedBox(height: 16),
            Text(
              _cameraError!,
              style: const TextStyle(color: Colors.white70),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: _initCamera,
              child: const Text('Retry', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    }

    if (!_cameraInitialized) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        ClipRect(child: CameraPreview(_cameraController!)),
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
                  _buildCaptureButton()
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
        if (_locationError != null)
          TextButton(
            onPressed: _getLocation,
            child: const Text('Retry'),
          ),
      ],
    );
  }

  Widget _buildCaptureButton() {
    return GestureDetector(
      onTap: _cameraInitialized ? _takeSelfie : null,
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
