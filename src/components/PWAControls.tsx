import React, { useEffect, useState } from 'react';
import { Download, WifiOff, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showMobileGuide, setShowMobileGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-600/20 px-3 py-1.5 text-xs font-semibold text-violet-200 transition-colors hover:bg-violet-600/35 whitespace-nowrap shrink-0"
      >
        <Download className="h-3.5 w-3.5" />
        <span>{compact ? 'Instalar' : 'Instalar App'}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowMobileGuide(true)}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
      >
        <Smartphone className="h-3.5 w-3.5 text-violet-400" />
        <span>{compact ? 'Móvil' : 'Instalar en Móvil / PC'}</span>
      </button>

      {showMobileGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm rounded-xl border border-slate-800 bg-[#121521] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowMobileGuide(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-800"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="font-display text-base font-bold text-slate-50">
              Instalar NixoraAI Helper
            </h3>
            {isIOS ? (
              <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                <li>1. Toca el botón <strong>Compartir</strong> en Safari.</li>
                <li>2. Baja y elige <strong>Añadir a la pantalla de inicio</strong>.</li>
                <li>3. Ábrela como app móvil en pantalla completa.</li>
              </ol>
            ) : (
              <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
                <li>1. En Android (Chrome): abre el menú <strong>⋮</strong> y toca <strong>Instalar aplicación</strong>.</li>
                <li>2. En Windows (Chrome / Edge): haz clic en el icono de instalar en la barra de direcciones.</li>
              </ol>
            )}
            <button
              type="button"
              onClick={() => setShowMobileGuide(false)}
              className="mt-5 w-full rounded-lg bg-violet-600 py-2.5 text-xs font-semibold text-white hover:bg-violet-500"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/90 px-3 py-2 text-xs font-medium text-amber-100 shadow-lg lg:bottom-4">
      <WifiOff className="h-3.5 w-3.5 text-amber-300" />
      <span>Sin conexión — Modo offline activo (minijuegos disponibles).</span>
    </div>
  );
};
