import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, ArrowUpToLine } from 'lucide-react';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFReaderProps {
  url: string;
  initialPage?: number;
  onPageChange?: (page: number, total: number) => void;
  targetPage?: number;
}

export function PDFReader({ url, initialPage = 1, onPageChange, targetPage }: PDFReaderProps) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [trackingReady, setTrackingReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentPageRef = useRef(initialPage);
  const restoreTimersRef = useRef<number[]>([]);
  const scrollFrameRef = useRef<number | null>(null);
  const touchRef = useRef<{ dist: number } | null>(null);

  const clearRestoreTimers = useCallback(() => {
    restoreTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    restoreTimersRef.current = [];
  }, []);

  const scrollExactlyToPage = useCallback((page: number, behavior: ScrollBehavior = 'auto') => {
    const container = containerRef.current;
    const target = pageRefs.current[page - 1];
    if (!container || !target) return false;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = container.scrollTop + targetRect.top - containerRect.top - 12;

    container.scrollTo({ top: Math.max(0, top), behavior });
    currentPageRef.current = page;
    setCurrentPage(page);
    return true;
  }, []);

  const detectCurrentPage = useCallback(() => {
    const container = containerRef.current;
    if (!container || !numPages || !trackingReady) return;

    const containerRect = container.getBoundingClientRect();
    const viewportCenter = containerRect.top + container.clientHeight / 2;

    let bestPage = currentPageRef.current;
    let bestDistance = Number.POSITIVE_INFINITY;

    pageRefs.current.forEach((pageEl, index) => {
      if (!pageEl) return;
      const rect = pageEl.getBoundingClientRect();

      // Prefer the page that actually contains the vertical center of the reading viewport.
      if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
        bestPage = index + 1;
        bestDistance = 0;
        return;
      }

      if (bestDistance === 0) return;

      const pageCenter = rect.top + rect.height / 2;
      const distance = Math.abs(pageCenter - viewportCenter);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPage = index + 1;
      }
    });

    if (bestPage !== currentPageRef.current) {
      currentPageRef.current = bestPage;
      setCurrentPage(bestPage);
      onPageChange?.(bestPage, numPages);
    }
  }, [numPages, onPageChange, trackingReady]);

  useEffect(() => {
    if (loading || numPages === 0) return;

    clearRestoreTimers();
    setTrackingReady(false);

    const target = Math.min(Math.max(1, initialPage), numPages);

    // The page wrappers exist immediately, but their heights can still change while
    // PDF.js finishes rendering. Re-anchor a few times, then release normal tracking.
    [0, 250, 700, 1400].forEach((delay) => {
      const timer = window.setTimeout(() => {
        scrollExactlyToPage(target);
      }, delay);
      restoreTimersRef.current.push(timer);
    });

    const enableTimer = window.setTimeout(() => {
      setTrackingReady(true);
      window.requestAnimationFrame(detectCurrentPage);
    }, 1750);
    restoreTimersRef.current.push(enableTimer);

    return clearRestoreTimers;
  }, [clearRestoreTimers, detectCurrentPage, initialPage, loading, numPages, scrollExactlyToPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !trackingReady) return;

    const onScroll = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;
        detectCurrentPage();
      });
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    onScroll();

    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, [detectCurrentPage, trackingReady]);

  useEffect(() => {
    if (!targetPage || loading || numPages === 0) return;
    const page = Math.min(Math.max(1, targetPage), numPages);
    scrollExactlyToPage(page, 'smooth');

    const timer = window.setTimeout(() => {
      detectCurrentPage();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [detectCurrentPage, loading, numPages, scrollExactlyToPage, targetPage]);

  useEffect(() => {
    if (!trackingReady) return;
    const timer = window.setTimeout(detectCurrentPage, 180);
    return () => window.clearTimeout(timer);
  }, [detectCurrentPage, scale, trackingReady]);

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      touchRef.current = { dist };
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const delta = dist - touchRef.current.dist;

      if (Math.abs(delta) > 20) {
        const zoomFactor = delta > 0 ? 0.05 : -0.05;
        setScale((s) => Math.min(Math.max(0.5, s + zoomFactor), 3));
        touchRef.current = { dist };
      }
    }
  };

  const handleTouchEnd = () => {
    touchRef.current = null;
  };

  function onDocumentLoadSuccess({ numPages: total }: { numPages: number }) {
    setTrackingReady(false);
    setNumPages(total);
    setLoading(false);
  }

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4"
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
            {Array.from({ length: numPages }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <div
                  key={`page_${pageNumber}`}
                  ref={(el) => (pageRefs.current[index] = el)}
                  data-page-number={pageNumber}
                  className="relative shadow-lg"
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer
                    className="bg-white"
                    width={Math.min(window.innerWidth * 0.95, 800)}
                    loading={<div className="h-[800px] w-full bg-white animate-pulse" />}
                  />
                  <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 bg-white/90 px-1 rounded border">
                    {pageNumber}
                  </div>
                </div>
              );
            })}
          </Document>
        </div>
      </div>

      <Button
        variant="secondary"
        size="icon"
        className="absolute bottom-20 right-4 rounded-full shadow-xl opacity-90 hover:opacity-100 z-30"
        onClick={scrollToTop}
        aria-label="Voltar ao início"
      >
        <ArrowUpToLine className="h-5 w-5" />
      </Button>

      <div className="bg-white dark:bg-gray-800 border-t border-border px-3 py-2 flex items-center justify-between shadow-lg z-20 gap-3">
        <div className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          Página {currentPage}{numPages ? ` / ${numPages}` : ''}
        </div>
        <div className="flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1 border border-border/50">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScale((s) => Math.min(3, s + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
