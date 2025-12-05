import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, ArrowUpToLine } from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

interface PDFReaderProps {
  url: string;
  initialPage?: number;
  onPageChange?: (page: number, total: number) => void;
}

export function PDFReader({ url, initialPage = 1, onPageChange }: PDFReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Variáveis para controle de gesto (Pinch Zoom)
  const touchRef = useRef<{ dist: number } | null>(null);

  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  }, []);

  // --- LÓGICA DE PINCH-TO-ZOOM (Pinça) ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      touchRef.current = { dist };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      
      // Calcula a diferença
      const delta = dist - touchRef.current.dist;
      
      // Se a diferença for significativa, ajusta o zoom
      if (Math.abs(delta) > 20) {
        // Sensibilidade do zoom
        const zoomFactor = delta > 0 ? 0.05 : -0.05;
        setScale(s => Math.min(Math.max(0.5, s + zoomFactor), 3.0));
        touchRef.current = { dist }; // Atualiza a distância base
      }
    }
  };

  const handleTouchEnd = () => {
    touchRef.current = null;
  };
  // ----------------------------------------

  // Observer de Página
  useEffect(() => {
    if (!numPages || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageIndex = Number(entry.target.getAttribute('data-page-number'));
            if (pageIndex) onPageChange?.(pageIndex, numPages);
          }
        });
      },
      { root: containerRef.current, threshold: 0.1, rootMargin: '-40% 0px -40% 0px' }
    );
    pageRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [numPages, loading, onPageChange]);

  // Rola para página inicial
  useEffect(() => {
    if (!loading && numPages > 0 && initialPage > 1 && pageRefs.current[initialPage - 1]) {
      pageRefs.current[initialPage - 1]?.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading, numPages, initialPage]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
      
      {/* ÁREA DE LEITURA */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 scroll-smooth"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col items-center gap-4 min-h-[500px]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 h-full w-full rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
            error={
              <div className="text-center p-8 bg-white rounded">
                <p className="text-red-500">Erro ao abrir livro.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Recarregar</Button>
              </div>
            }
            className="flex flex-col items-center gap-4 w-full"
          >
            {Array.from(new Array(numPages), (el, index) => (
              <div 
                key={`page_${index + 1}`}
                ref={(el) => (pageRefs.current[index] = el)}
                data-page-number={index + 1}
                className="relative shadow-lg transition-transform duration-75 ease-linear" // Transição suave para o zoom
              >
                <Page 
                  pageNumber={index + 1} 
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="bg-white"
                  width={Math.min(window.innerWidth * 0.95, 800)}
                  loading={<div className="h-[800px] w-full bg-white animate-pulse" />}
                />
                <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 bg-white/90 px-1 rounded border">
                  {index + 1}
                </div>
              </div>
            ))}
          </Document>
        </div>
      </div>

      {/* BOTÃO TOPO */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-20 right-4 rounded-full shadow-xl opacity-90 hover:opacity-100 z-30"
        onClick={scrollToTop}
      >
        <ArrowUpToLine className="h-5 w-5" />
      </Button>

      {/* BARRA ZOOM */}
      <div className="bg-white dark:bg-gray-800 border-t border-border p-3 flex items-center justify-center shadow-lg z-20 gap-4">
        <div className="flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1 border border-border/50">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale(s => Math.min(3.0, s + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}