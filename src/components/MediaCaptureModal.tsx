import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Monitor,
  Video,
  Image as ImageIcon,
  ShieldCheck,
  ShieldAlert,
  X,
  Check,
  StopCircle,
} from 'lucide-react';
import { MediaAttachment } from '../types';

export type MediaPermissionType = 'files' | 'camera' | 'screen';

export interface MediaPermissionsState {
  files: 'granted' | 'prompt' | 'denied';
  camera: 'granted' | 'prompt' | 'denied';
  screen: 'granted' | 'prompt' | 'denied';
}

const PERM_STORAGE_KEY = 'nixora_media_permissions_v1';

export function loadSavedMediaPermissions(): MediaPermissionsState {
  try {
    const raw = localStorage.getItem(PERM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MediaPermissionsState>;
      return {
        files: parsed.files || 'prompt',
        camera: parsed.camera || 'prompt',
        screen: parsed.screen || 'prompt',
      };
    }
  } catch {
    // Ignore storage issues
  }
  return { files: 'prompt', camera: 'prompt', screen: 'prompt' };
}

interface MediaCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttachMedia: (media: MediaAttachment) => void;
}

export const MediaCaptureModal: React.FC<MediaCaptureModalProps> = ({
  isOpen,
  onClose,
  onAttachMedia,
}) => {
  const [permissions, setPermissions] = useState<MediaPermissionsState>(() =>
    loadSavedMediaPermissions()
  );
  const [pendingConsentFor, setPendingConsentFor] = useState<{
    type: MediaPermissionType;
    action: () => void;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'capture' | 'permissions'>('capture');

  const [cameraMode, setCameraMode] = useState<'photo' | 'video5s' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const autoStopTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopActiveStreams = () => {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (autoStopTimeoutRef.current) {
      window.clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
    setRecordSeconds(0);
    setCameraMode(null);
  };

  useEffect(() => {
    if (!isOpen) {
      stopActiveStreams();
      setError(null);
      setPendingConsentFor(null);
    }
    return () => stopActiveStreams();
  }, [isOpen]);

  const updatePermission = (type: MediaPermissionType, state: 'granted' | 'prompt' | 'denied') => {
    setPermissions((prev) => {
      const next = { ...prev, [type]: state };
      try {
        localStorage.setItem(PERM_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const requirePermissionThenRun = (type: MediaPermissionType, action: () => void) => {
    setError(null);
    if (permissions[type] === 'granted') {
      action();
      return;
    }
    setPendingConsentFor({ type, action });
  };

  const handleGrantConsent = () => {
    if (!pendingConsentFor) return;
    const { type, action } = pendingConsentFor;
    updatePermission(type, 'granted');
    setPendingConsentFor(null);
    action();
  };

  const handleDenyConsent = () => {
    if (!pendingConsentFor) return;
    updatePermission(pendingConsentFor.type, 'denied');
    setPendingConsentFor(null);
    setError(
      'Permiso denegado. Puedes volver a habilitarlo en la pestaña "Permisos Móvil/PC" o usar otra opción.'
    );
  };

  // Convert Blob to base64 without data URL prefix
  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || '');
        const commaIdx = result.indexOf(',');
        resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
      };
      reader.onerror = () => reject(new Error('No se pudo leer el archivo multimedia.'));
      reader.readAsDataURL(blob);
    });

  // 1. Capture Screen Frame (PC)
  const startScreenScreenshot = async () => {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error(
          'La captura de pantalla directa no está disponible en este navegador móvil. Usa "Foto con cámara" o "Galería / Archivos".'
        );
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();

      await new Promise((r) => setTimeout(r, 220));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

      stream.getTracks().forEach((t) => t.stop());

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88)
      );
      if (!blob) throw new Error('No se pudo generar la captura.');

      const base64Data = await blobToBase64(blob);
      const previewUrl = URL.createObjectURL(blob);
      onAttachMedia({
        kind: 'image',
        mimeType: 'image/jpeg',
        base64Data,
        previewUrl,
        fileName: `captura-nixora-${Date.now()}.jpg`,
      });
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo capturar la pantalla. Verifica los permisos del navegador.'
      );
    }
  };

  // 2. Open Camera for Photo or 5-Second Video
  const openCamera = async (mode: 'photo' | 'video5s') => {
    try {
      stopActiveStreams();
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Tu dispositivo no permite acceso directo a la cámara desde el navegador. Usa "Galería / Archivos".');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: mode === 'video5s',
      });
      streamRef.current = stream;
      setCameraMode(mode);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? `No se pudo abrir la cámara: ${err.message}`
          : 'Permiso de cámara bloqueado por el sistema.'
      );
    }
  };

  const snapCameraPhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88)
    );
    stopActiveStreams();
    if (!blob) {
      setError('No se pudo capturar la fotografía.');
      return;
    }

    const base64Data = await blobToBase64(blob);
    onAttachMedia({
      kind: 'image',
      mimeType: 'image/jpeg',
      base64Data,
      previewUrl: URL.createObjectURL(blob),
      fileName: `foto-nixora-${Date.now()}.jpg`,
    });
    onClose();
  };

  // 3. Record 5-Second Video (Camera or Screen)
  const startFiveSecondRecording = async (source: 'camera' | 'screen') => {
    try {
      setError(null);
      let stream = streamRef.current;
      if (source === 'screen') {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Grabación de pantalla no disponible en móvil; usa cámara de 5 segundos o galería.');
        }
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        streamRef.current = stream;
        setCameraMode('video5s');
        setTimeout(() => {
          if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 60);
      }

      if (!stream) {
        throw new Error('No hay transmisión activa para grabar.');
      }

      const preferredMime = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, { mimeType: preferredMime });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const cleanMime = preferredMime.split(';')[0];
        const blob = new Blob(chunks, { type: cleanMime });
        stopActiveStreams();
        if (blob.size === 0) {
          setError('El clip de video resultó vacío. Intenta grabar de nuevo.');
          return;
        }
        const base64Data = await blobToBase64(blob);
        onAttachMedia({
          kind: 'video',
          mimeType: cleanMime,
          base64Data,
          previewUrl: URL.createObjectURL(blob),
          fileName: `clip-5s-nixora-${Date.now()}.webm`,
          durationSeconds: 5,
        });
        onClose();
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);

      const startedAt = Date.now();
      recordTimerRef.current = window.setInterval(() => {
        const elapsed = Math.min(5, (Date.now() - startedAt) / 1000);
        setRecordSeconds(elapsed);
      }, 100);

      autoStopTimeoutRef.current = window.setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 5000);
    } catch (err: unknown) {
      stopActiveStreams();
      setError(
        err instanceof Error ? err.message : 'No se pudo iniciar la grabación de 5 segundos.'
      );
    }
  };

  // 4. Select Image or <=5s Video from Mobile Gallery / PC Files
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError(null);
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError('Solo se admiten imágenes o videos cortos de hasta 5 segundos.');
      return;
    }

    if (file.size > 18 * 1024 * 1024) {
      setError('El archivo supera 18 MB. Usa una imagen o clip más ligero de 5 segundos.');
      return;
    }

    if (isVideo) {
      const tempUrl = URL.createObjectURL(file);
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.src = tempUrl;
      await new Promise<void>((resolve) => {
        vid.onloadedmetadata = () => resolve();
        vid.onerror = () => resolve();
      });
      if (vid.duration && vid.duration > 5.8) {
        URL.revokeObjectURL(tempUrl);
        setError(
          `El video dura ${vid.duration.toFixed(1)}s. Para que NixoraAI lo lea rápido, elige o graba un video de máximo 5 segundos.`
        );
        return;
      }
      const base64Data = await blobToBase64(file);
      onAttachMedia({
        kind: 'video',
        mimeType: file.type || 'video/mp4',
        base64Data,
        previewUrl: tempUrl,
        fileName: file.name,
        durationSeconds: Math.min(5, Math.round(vid.duration || 5)),
      });
      onClose();
      return;
    }

    const base64Data = await blobToBase64(file);
    onAttachMedia({
      kind: 'image',
      mimeType: file.type || 'image/jpeg',
      base64Data,
      previewUrl: URL.createObjectURL(file),
      fileName: file.name,
    });
    onClose();
  };

  if (!isOpen) return null;

  const permLabels: Record<MediaPermissionType, { title: string; desc: string }> = {
    files: {
      title: 'Acceso a archivos multimedia y galería en el móvil',
      desc: 'Permite seleccionar capturas de pantalla, fotos o videos de 5 segundos guardados en tu teléfono o PC para que NixoraAI los analice.',
    },
    camera: {
      title: 'Permiso de cámara (Foto o Video 5s)',
      desc: 'Permite usar la cámara del móvil o webcam para fotografiar tu pantalla o grabar un clip de hasta 5 segundos.',
    },
    screen: {
      title: 'Permiso de captura de pantalla (PC)',
      desc: 'Permite capturar la ventana de Minecraft o grabar 5 segundos de pantalla para que la IA lea errores o bugs.',
    },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-capture-title"
    >
      <div className="relative w-full max-w-lg rounded-t-2xl border border-slate-800 bg-[#121521] p-5 shadow-2xl sm:rounded-xl sm:p-6">
        <button
          type="button"
          onClick={() => {
            stopActiveStreams();
            onClose();
          }}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          aria-label="Cerrar captura"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="media-capture-title" className="font-display text-lg font-bold text-slate-50">
          Captura y Multimedia para NixoraAI
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Envía una imagen o un video de 5 segundos para que la IA lo vea y te ayude.
        </p>

        {/* Sub-tabs */}
        <div className="mt-4 flex rounded-lg bg-[#0B0D14] p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('capture')}
            className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
              activeTab === 'capture'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Capturar o Subir
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 rounded-md py-2 text-xs font-medium transition-colors ${
              activeTab === 'permissions'
                ? 'bg-violet-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Permisos Móvil / PC
          </button>
        </div>

        {/* Explicit Permission Prompt Overlay inside modal */}
        {pendingConsentFor && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-950/25 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-bold text-amber-100">
                  Solicitud de permiso: {permLabels[pendingConsentFor.type].title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
                  {permLabels[pendingConsentFor.type].desc}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleDenyConsent}
                className="min-h-[40px] rounded-lg border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Denegar
              </button>
              <button
                type="button"
                onClick={handleGrantConsent}
                className="min-h-[40px] rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Permitir acceso
              </button>
            </div>
          </div>
        )}

        {activeTab === 'capture' ? (
          <div className="mt-4 space-y-4">
            {cameraMode ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-56 w-full object-cover"
                  />
                  {isRecording && (
                    <div className="absolute inset-x-3 bottom-3 space-y-1.5 rounded-lg bg-black/75 p-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-white tabular-nums">
                        <span>Grabando clip para la IA...</span>
                        <span>{recordSeconds.toFixed(1)}s / 5.0s</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full bg-red-500 transition-all duration-100"
                          style={{ width: `${(recordSeconds / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={stopActiveStreams}
                    className="min-h-[44px] rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  {cameraMode === 'photo' ? (
                    <button
                      type="button"
                      onClick={snapCameraPhoto}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-violet-600 px-5 py-2 text-xs font-semibold text-white hover:bg-violet-500"
                    >
                      <Camera className="h-4 w-4" />
                      Tomar foto ahora
                    </button>
                  ) : isRecording ? (
                    <button
                      type="button"
                      onClick={() => recorderRef.current?.stop()}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      <StopCircle className="h-4 w-4" />
                      Detener y adjuntar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startFiveSecondRecording('camera')}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      <Video className="h-4 w-4" />
                      Grabar 5 segundos
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    requirePermissionThenRun('screen', startScreenScreenshot)
                  }
                  className="flex min-h-[72px] items-center gap-3 rounded-xl border border-slate-800 bg-[#0B0D14] p-3.5 text-left transition-colors hover:border-violet-500/50 hover:bg-[#151929]"
                >
                  <Monitor className="h-5 w-5 shrink-0 text-violet-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-100">
                      Captura de pantalla (PC)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      La IA lee tu pantalla al instante
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    requirePermissionThenRun('camera', () => openCamera('photo'))
                  }
                  className="flex min-h-[72px] items-center gap-3 rounded-xl border border-slate-800 bg-[#0B0D14] p-3.5 text-left transition-colors hover:border-violet-500/50 hover:bg-[#151929]"
                >
                  <Camera className="h-5 w-5 shrink-0 text-violet-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-100">
                      Foto con cámara
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Ideal en móvil Android / iOS
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    requirePermissionThenRun('camera', () => openCamera('video5s'))
                  }
                  className="flex min-h-[72px] items-center gap-3 rounded-xl border border-slate-800 bg-[#0B0D14] p-3.5 text-left transition-colors hover:border-violet-500/50 hover:bg-[#151929]"
                >
                  <Video className="h-5 w-5 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-100">
                      Grabar video de 5s
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Clip corto de máx. 5 segundos
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    requirePermissionThenRun('files', () => fileInputRef.current?.click())
                  }
                  className="flex min-h-[72px] items-center gap-3 rounded-xl border border-slate-800 bg-[#0B0D14] p-3.5 text-left transition-colors hover:border-violet-500/50 hover:bg-[#151929]"
                >
                  <ImageIcon className="h-5 w-5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-100">
                      Galería / Archivos
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Foto o video ≤ 5s del dispositivo
                    </p>
                  </div>
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelected}
              className="hidden"
            />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {(['files', 'camera', 'screen'] as MediaPermissionType[]).map((key) => {
              const status = permissions[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0B0D14] p-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-100">
                      {permLabels[key].title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Estado:{' '}
                      <strong
                        className={
                          status === 'granted'
                            ? 'text-emerald-400'
                            : status === 'denied'
                              ? 'text-red-400'
                              : 'text-amber-300'
                        }
                      >
                        {status === 'granted'
                          ? 'Permitido'
                          : status === 'denied'
                            ? 'Denegado'
                            : 'Preguntar antes'}
                      </strong>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {status !== 'granted' ? (
                      <button
                        type="button"
                        onClick={() => updatePermission(key, 'granted')}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Permitir
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updatePermission(key, 'prompt')}
                        className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        Revocar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
