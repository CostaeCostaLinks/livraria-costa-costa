import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Heart, Copy, Check, Coffee } from 'lucide-react';
import { toast } from 'sonner';

export function DonationModal() {
  const [copied, setCopied] = useState(false);

  // SUBSTITUA PELA SUA CHAVE REAL
  const PIX_KEY = "cleverson128@hotmail.com"; 

  const handleCopy = () => {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    toast.success("Chave PIX copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="hidden md:flex border-primary/30 text-primary hover:bg-primary/5 gap-2 transition-all hover:scale-105"
        >
          <Heart className="h-4 w-4 fill-primary/10" /> Apoie o Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary font-serif text-2xl">
            <Coffee className="h-6 w-6" /> Apoie o Projeto
          </DialogTitle>
          <DialogDescription className="pt-2 text-base">
            O <strong>Costa & Costa Library</strong> é gratuito. 
            Sua oferta voluntária nos ajuda a manter o projeto no ar e trazer novos livros.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-4">
          
          {/* ÁREA DO QR CODE */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-yellow-400 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-48 h-48 bg-white border border-border rounded-lg flex items-center justify-center p-2 shadow-sm">
              {/* AQUI ESTÁ A MÁGICA: A imagem busca na pasta public */}
              <img 
                src="/qrcode-pix.jpg" 
                alt="QR Code PIX" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback elegante se a imagem não existir
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<span class="text-xs text-center text-muted-foreground">QR Code não encontrado.<br/>(Salve como qrcode-pix.png na pasta public)</span>';
                }}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full">
            <div className="grid flex-1 gap-2">
              <label htmlFor="link" className="sr-only">Chave PIX</label>
              {/* CORREÇÃO: Removido 'bg-background' para eliminar conflito com 'bg-muted/50' */}
              <div className="flex h-10 w-full rounded-md border border-input px-3 py-2 text-sm items-center text-muted-foreground font-mono bg-muted/50">
                {PIX_KEY}
              </div>
            </div>
            <Button type="submit" size="sm" className="px-3" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Chave PIX: Email
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}