import { useEffect } from 'react';
import { usePWAStore } from '@/stores/pwa.store';

export function usePWAInstall() {
  const { 
    deferredPrompt, 
    isInstallable, 
    setDeferredPrompt, 
    setIsInstallable 
  } = usePWAStore();

  useEffect(() => {
    const handler = (e: Event) => {
      // Previne o mini-infobar padrão do Chrome (para usarmos o nosso botão)
      e.preventDefault();
      // Guarda o evento na memória global para usar depois
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('PWA: Evento de instalação capturado!');
    };

    // Só adiciona o ouvinte se ainda não tivermos o evento guardado
    // Isso evita perder o evento ao navegar entre páginas
    if (!deferredPrompt) {
      window.addEventListener('beforeinstallprompt', handler);
    }

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('PWA: App instalado com sucesso!');
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [deferredPrompt, setDeferredPrompt, setIsInstallable]);

  const installApp = async () => {
    if (!deferredPrompt) {
      console.log('PWA: Nenhum evento de instalação disponível para disparar.');
      return;
    }

    // Mostra o prompt nativo do navegador
    deferredPrompt.prompt();

    // Espera a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA: Usuário escolheu ${outcome}`);
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    
    // Limpa o prompt usado (alguns navegadores invalidam após uso)
    setDeferredPrompt(null);
  };

  return { isInstallable, installApp };
}