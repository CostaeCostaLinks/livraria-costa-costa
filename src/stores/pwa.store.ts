import { create } from 'zustand';

interface PWAState {
  deferredPrompt: any;
  isInstallable: boolean;
  setDeferredPrompt: (prompt: any) => void;
  setIsInstallable: (value: boolean) => void;
}

export const usePWAStore = create<PWAState>((set) => ({
  deferredPrompt: null,
  isInstallable: false,
  setDeferredPrompt: (prompt) => set({ deferredPrompt: prompt }),
  setIsInstallable: (value) => set({ isInstallable: value }),
}));