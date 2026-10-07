import { useEffect, useState } from 'react';
import { X, Share, PlusSquare, Download, Smartphone, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallBanner() {
  const { isInstallable, isStandalone, isIOS, isAndroid, installApp } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    if (sessionStorage.getItem('pwa-banner-closed')) return;

    const timer = window.setTimeout(() => {
      if (isInstallable || isIOS || isAndroid) {
        setIsVisible(true);
      }
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [isAndroid, isIOS, isInstallable, isStandalone]);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa-banner-closed', 'true');
  };

  if (!isVisible || isStandalone) return null;

  const handleInstall = async () => {
    if (isInstallable) {
      await installApp();
      setIsVisible(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-500 max-w-md mx-auto md:ml-auto md:mr-4">
      <div className="bg-gradient-to-br from-primary to-emerald-900 text-white p-4 rounded-xl shadow-2xl border border-yellow-500/30 relative overflow-hidden">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-2 right-2 text-emerald-100 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors z-20"
          aria-label="Fechar aviso de instalação"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex gap-4 relative z-10">
          <div className="bg-white/10 p-3 rounded-xl h-fit backdrop-blur-sm shrink-0">
            <Smartphone className="h-8 w-8 text-yellow-400" />
          </div>

          <div className="flex-1 min-w-0 pr-5">
            <h3 className="font-serif font-bold text-lg text-yellow-50 mb-1">Instalar App</h3>

            {isInstallable ? (
              <>
                <p className="mb-3 text-sm text-emerald-50 opacity-90 leading-tight">
                  Instale a Costa & Costa Library na tela inicial do seu celular.
                </p>
                <Button
                  type="button"
                  onClick={handleInstall}
                  variant="secondary"
                  size="sm"
                  className="w-full bg-yellow-400 text-emerald-900 hover:bg-yellow-300 font-bold border-none shadow-lg"
                >
                  <Download className="h-4 w-4 mr-2" /> Instalar Agora
                </Button>
              </>
            ) : isIOS ? (
              <div className="text-sm text-emerald-50 space-y-2">
                <p className="leading-tight">No Safari:</p>
                <ol className="space-y-1 text-xs opacity-95">
                  <li className="flex items-center gap-1"><Share className="h-3 w-3" /> Toque em <strong>Compartilhar</strong>.</li>
                  <li className="flex items-center gap-1"><PlusSquare className="h-3 w-3" /> Escolha <strong>Adicionar à Tela de Início</strong>.</li>
                </ol>
              </div>
            ) : (
              <div className="text-sm text-emerald-50 space-y-2">
                <p className="leading-tight">
                  O navegador atual não liberou o botão automático de instalação.
                </p>
                <ol className="space-y-1 text-xs opacity-95">
                  <li className="flex items-center gap-1"><MoreVertical className="h-3 w-3" /> Abra o menu do Chrome.</li>
                  <li>Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
                </ol>
                <p className="text-[11px] opacity-80">
                  Se abriu pelo WhatsApp/Instagram, use “Abrir no Chrome” primeiro.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
