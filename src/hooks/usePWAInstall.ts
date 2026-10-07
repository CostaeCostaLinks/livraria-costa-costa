import { useCallback, useEffect, useMemo } from 'react';
import { usePWAStore } from '@/stores/pwa.store';

export function usePWAInstall() {
  const {
    deferredPrompt,
    isInstallable,
    setDeferredPrompt,
    setIsInstallable,
  } = usePWAStore();

  const isStandalone = useMemo(
    () =>
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
    []
  );

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isAndroid = /android/.test(userAgent);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setIsInstallable(true);
    };

    const handleInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      sessionStorage.removeItem('pwa-banner-closed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [setDeferredPrompt, setIsInstallable]);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setIsInstallable(false);

    return outcome === 'accepted';
  }, [deferredPrompt, setDeferredPrompt, setIsInstallable]);

  return {
    isInstallable,
    isStandalone,
    isIOS,
    isAndroid,
    installApp,
  };
}
