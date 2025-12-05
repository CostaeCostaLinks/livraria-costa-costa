import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallBanner() {
  const { isInstallable, installApp } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // 1. Verifica se já foi fechado pelo usuário
    const hasClosed = localStorage.getItem('pwa-banner-closed');
    if (hasClosed) return;

    // 2. Verifica se já está instalado (Modo App)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // 3. Detecta iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Lógica de Exibição:
    // Só mostra se for possível instalar (Android/PC) OU se for iOS (que precisa de instrução)
    const timer = setTimeout(() => {
      if (isInstallable || isIosDevice) {
        setIsVisible(true);
      }
    }, 3000); // Espera 3s para não assustar o usuário logo de cara

    return () => clearTimeout(timer);
  }, [isInstallable]);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-banner-closed', 'true'); // Salva que fechou para não mostrar mais
  };

  if (!isVisible) return null;

  return (
    // 'bottom-20' no mobile para não cobrir o menu, 'z-[60]' para ficar em cima de tudo
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-500 max-w-md mx-auto md:ml-auto md:mr-4">
      <div className="bg-gradient-to-br from-primary to-emerald-900 text-white p-4 rounded-xl shadow-2xl border border-yellow-500/30 relative overflow-hidden">
        
        <button 
          onClick={handleClose}
          className="absolute top-2 right-2 text-emerald-100 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors z-20"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex gap-4 relative z-10">
          <div className="bg-white/10 p-3 rounded-xl h-fit backdrop-blur-sm shrink-0">
            <Smartphone className="h-8 w-8 text-yellow-400" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-bold text-lg text-yellow-50 mb-1">
              Instalar App
            </h3>
            
            {isIOS ? (
              <div className="text-sm text-emerald-50 space-y-2">
                <p className="leading-tight">Para instalar no iPhone:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs opacity-90">
                  <li className="flex items-center gap-1">
                    Toque em <Share className="h-3 w-3" /> <strong>Compartilhar</strong>
                  </li>
                  <li className="flex items-center gap-1">
                    Selecione <PlusSquare className="h-3 w-3" /> <strong>Início</strong>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="text-sm text-emerald-50">
                <p className="mb-3 opacity-90 leading-tight">
                  Adicione à tela inicial para ler offline e em tela cheia.
                </p>
                <Button 
                  onClick={installApp}
                  variant="secondary" 
                  size="sm" 
                  className="w-full bg-yellow-400 text-emerald-900 hover:bg-yellow-300 font-bold border-none shadow-lg"
                >
                  <Download className="h-4 w-4 mr-2" /> Instalar Agora
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}