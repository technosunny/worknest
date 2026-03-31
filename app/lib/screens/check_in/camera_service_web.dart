import 'dart:convert';
import 'dart:js_interop';
import 'dart:typed_data';
import 'dart:ui_web' as ui_web;
import 'package:flutter/widgets.dart';
import 'package:web/web.dart' as web;

web.HTMLVideoElement? _video;
web.MediaStream? _stream;

Future<String?> initWebCamera() async {
  try {
    final viewId = 'camera-${DateTime.now().millisecondsSinceEpoch}';

    final constraints = web.MediaStreamConstraints(
      video: {
        'facingMode': 'user',
        'width': {'ideal': 640},
        'height': {'ideal': 640},
      }.jsify(),
    );

    _stream = await web.window.navigator.mediaDevices
        .getUserMedia(constraints)
        .toDart;

    _video = web.document.createElement('video') as web.HTMLVideoElement;
    _video!.srcObject = _stream;
    _video!.autoplay = true;
    _video!.muted = true;
    _video!.setAttribute('playsinline', 'true');
    _video!.style.width = '100%';
    _video!.style.height = '100%';
    _video!.style.objectFit = 'cover';
    _video!.style.transform = 'scaleX(-1)';

    ui_web.platformViewRegistry.registerViewFactory(
      viewId,
      (int id, {Object? params}) => _video!,
    );

    await _video!.play().toDart;
    return viewId;
  } catch (e) {
    return null;
  }
}

Widget buildWebCameraPreview(double size, String viewId) {
  return SizedBox(
    width: size,
    height: size,
    child: ClipOval(
      child: HtmlElementView(viewType: viewId),
    ),
  );
}

Future<Uint8List?> captureWebFrame() async {
  if (_video == null) return null;

  final vw = _video!.videoWidth;
  final vh = _video!.videoHeight;

  final canvas = web.document.createElement('canvas') as web.HTMLCanvasElement;
  canvas.width = vw;
  canvas.height = vh;
  final ctx = canvas.getContext('2d')! as web.CanvasRenderingContext2D;

  // Mirror horizontally to match the preview
  ctx.translate(vw.toDouble(), 0);
  ctx.scale(-1, 1);
  ctx.drawImage(_video!, 0, 0);

  final dataUrl = canvas.toDataURL('image/jpeg', (0.85).toJS);
  final base64Data = dataUrl.split(',')[1];
  return Uint8List.fromList(base64Decode(base64Data));
}

void disposeWebCamera() {
  if (_stream != null) {
    final tracks = _stream!.getTracks().toDart;
    for (final track in tracks) {
      track.stop();
    }
  }
  _video = null;
  _stream = null;
}
