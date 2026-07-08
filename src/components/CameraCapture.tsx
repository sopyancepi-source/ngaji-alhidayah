import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface CameraCaptureProps {
  title: string;
  onCapture: (base64Photo: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ title, onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isStarting, setIsStarting] = useState(true);

  // Initialize camera stream
  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    setIsStarting(true);
    setErrorMessage('');
    stopCamera(); // stop any active stream first

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.error("Video play error:", err);
        });
      }
      setHasPermission(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Izin kamera ditolak. Silakan aktifkan izin kamera atau gunakan tombol fallback kamera bawaan HP di bawah.'
          : 'Kamera tidak dapat diakses langsung. Silakan jepret langsung menggunakan kamera bawaan HP di bawah.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      // Keep output extremely small & lightweight as requested (e.g. 360x360 or 400x400)
      const size = 360;
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Source crop calculations to make a perfect square thumbnail
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const minSize = Math.min(videoWidth, videoHeight);
        const sourceX = (videoWidth - minSize) / 2;
        const sourceY = (videoHeight - minSize) / 2;

        // Draw image frame
        ctx.drawImage(
          video,
          sourceX,
          sourceY,
          minSize,
          minSize,
          0,
          0,
          size,
          size
        );

        // Compress at 55% quality jpeg for incredibly fast uploads
        const base64 = canvas.toDataURL('image/jpeg', 0.55);
        onCapture(base64);
        onClose();
      }
    } catch (err) {
      console.error('Error drawing image on canvas:', err);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Safe fallback file handler (with capture="user") for mobile/iframe permission issues
  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 360;
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minSize = Math.min(img.width, img.height);
          const sourceX = (img.width - minSize) / 2;
          const sourceY = (img.height - minSize) / 2;

          ctx.drawImage(
            img,
            sourceX,
            sourceY,
            minSize,
            minSize,
            0,
            0,
            size,
            size
          );

          const base64 = canvas.toDataURL('image/jpeg', 0.55);
          onCapture(base64);
          onClose();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-slate-100 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Ambil Foto Langsung</h3>
            <p className="text-[10px] text-slate-500 font-medium">Shalat {title}</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-200/60 rounded-full transition-all text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-black aspect-square w-full flex items-center justify-center overflow-hidden">
          {hasPermission !== false && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          )}

          {/* Loading state */}
          {isStarting && hasPermission !== false && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-white gap-3 p-4">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
              <p className="text-xs font-bold text-slate-300">Menghubungkan ke kamera...</p>
            </div>
          )}

          {/* Permission/Error fallbacks */}
          {(hasPermission === false || errorMessage) && (
            <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-300 p-6 text-center">
              <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
              <p className="text-xs font-extrabold text-white mb-2">Akses Kamera Bermasalah</p>
              <p className="text-[10px] text-slate-400 mb-5 leading-relaxed px-2">
                {errorMessage || 'Izin kamera diperlukan untuk menjepret foto langsung.'}
              </p>
              
              {/* Native System Camera Fallback (Works everywhere, bypasses iframe constraints!) */}
              <label 
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold px-4 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-2 transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                Jepret Kamera Sistem (HP)
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFallbackFile}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
          {hasPermission !== false && !isStarting && (
            <div className="flex items-center justify-around">
              {/* Camera Switcher */}
              <button
                type="button"
                onClick={toggleCamera}
                className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-full text-slate-600 hover:text-slate-800 transition-all flex items-center justify-center shadow-xs"
                title="Ganti Kamera"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleCapture}
                className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all relative group"
              >
                <div className="absolute inset-1.5 rounded-full border-2 border-white/40 group-active:scale-90 transition-transform" />
                <Camera className="w-6 h-6 text-white" />
              </button>

              {/* Upload fallback button just in case */}
              <label
                className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-full text-slate-600 hover:text-slate-800 transition-all flex items-center justify-center shadow-xs cursor-pointer"
                title="Pilih dari Galeri"
              >
                <ImageIcon className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFallbackFile}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Quick info */}
          <p className="text-[9px] text-center text-slate-400 font-medium leading-relaxed">
            *Ukuran foto otomatis diperkecil agar sangat ringan dan cepat dikirim.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
