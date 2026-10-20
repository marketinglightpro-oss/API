import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, X, AlertCircle } from 'lucide-react';

export default function LiveCameraModal({
  isOpen,
  onClose,
  onCapture,
  title = 'Registro Fotográfico Obligatorio',
  subtitle = 'Por favor tómate una fotografía en vivo para validar tu asistencia',
}) {
  const [stream, setStream] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fallbackInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPhotoPreview(null);
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setIsInitializing(true);
    setCameraError(null);
    setPhotoPreview(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador no soporta acceso directo a la cámara.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(console.warn);
      }
    } catch (err) {
      console.warn('Error al iniciar cámara en vivo:', err);
      setCameraError(
        'No se pudo acceder a la cámara en vivo. Puedes usar el botón alternativo de captura frontal móvil.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth || 640, video.videoHeight || 640);

    canvas.width = 480;
    canvas.height = 480;

    const ctx = canvas.getContext('2d');
    const startX = ((video.videoWidth || 640) - size) / 2;
    const startY = ((video.videoHeight || 640) - size) / 2;

    // Dibujar recorte cuadrado centrado y comprimido a JPEG 0.8
    ctx.drawImage(video, startX, startY, size, size, 0, 0, 480, 480);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setPhotoPreview(dataUrl);
    stopCamera();
  };

  const handleFallbackCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current || document.createElement('canvas');
          const maxDim = 640;
          let w = img.width;
          let h = img.height;
          if (w > h && w > maxDim) {
            h = (h * maxDim) / w;
            w = maxDim;
          } else if (h > maxDim) {
            w = (w * maxDim) / h;
            h = maxDim;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          setPhotoPreview(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const retake = () => {
    setPhotoPreview(null);
    startCamera();
  };

  const confirm = () => {
    if (photoPreview) {
      onCapture(photoPreview);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col relative">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Camera className="w-5 h-5 text-black" />
              {title}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Video Preview */}
        <div className="p-4 sm:p-5 flex flex-col items-center">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-black flex items-center justify-center shadow-inner border-2 border-gray-200">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Captura en vivo"
                className="w-full h-full object-cover animate-fadeIn"
              />
            ) : cameraError ? (
              <div className="p-6 text-center text-white space-y-3">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                <p className="text-xs text-gray-300 leading-relaxed font-medium">
                  {cameraError}
                </p>
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="px-4 py-2 bg-white text-black font-bold text-xs rounded-full shadow hover:bg-gray-100 transition-all"
                >
                  Abrir Cámara Frontal Móvil
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {/* Visual Facial Framing Guide */}
                <div className="absolute inset-4 rounded-full border-2 border-dashed border-white/60 pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] text-white/70 font-mono tracking-widest uppercase bg-black/40 px-2 py-0.5 rounded-full">
                    Centra tu rostro
                  </span>
                </div>
              </>
            )}

            <canvas ref={canvasRef} className="hidden" />
            <input
              type="file"
              ref={fallbackInputRef}
              onChange={handleFallbackCapture}
              accept="image/*"
              capture="user"
              className="hidden"
            />
          </div>

          <div className="mt-4 text-center">
            <span className="text-[11px] text-gray-400 font-medium">
              Foto requerida para certificar asistencia presencial de Light Pro
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
          {photoPreview ? (
            <>
              <button
                type="button"
                onClick={retake}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Repetir Foto
              </button>
              <button
                type="button"
                onClick={confirm}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-black text-white hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Confirmar y Registrar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={takeSnapshot}
                disabled={Boolean(cameraError) || isInitializing}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-black text-white hover:bg-gray-800 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Camera className="w-4 h-4 text-white" />
                Capturar Foto
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
