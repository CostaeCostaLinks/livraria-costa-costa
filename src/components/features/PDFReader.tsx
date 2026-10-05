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
  const renderedPagesRef = useRef<Set<number>>(new Set());
  const restoreDoneRef = useRef(false);
  const restoreHintTimerRef = useRef<number | null>(null);
  const touchRef = useRef<{ dist: number } | null>(null);

  const normalizedInitialPage = Math.max(1, Math.min(initialPage, numPages || initialPage));

  const scrollExactlyToPage = useCallback((page: number, behavior: ScrollBehavior = 'auto') => {
    const container = containerRef.current;
    const target = pageRefs.current[page - 1];
    if (!container || !target) return false;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const top = container.scrollTop + targetRect.top - containerRect.top - 16;

    container.scrollTo({ top: Math.max(0, top), behavior });
    currentPageRef.current = page;
    setCurrentPage(page);
    return true;
  }, []);

  const completeInitialRestore = useCallback(() => {
    if (restoreDoneRef.current || loading || numPages === 0) return;

    const page = Math.max(1, Math.min(initialPage, numPages));
    if (!scrollExactlyToPage(page)) return;

    restoreDoneRef.current = true;

    if (restoreHintTimerRef.current) {
      window.clearTimeout(restoreHintTimerRef.current);
      restoreHintTimerRef.current = null;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setTrackingReady(true));
    });
  }, [initialPage, loading, numPages, scrollExactlyToPage]);

  const handlePageRenderSuccess = useCallback((pageNumber: number) => {
    renderedPagesRef.current.add(pageNumber);

    if (restoreDoneRef.current || loading || numPages === 0) return;

    const target = Math.max(1, Math.min(initialPage, numPages));

    for (let page = 1; page <= target; page += 1) {
      if (!renderedPagesRef.current.has(page)) return;
    }

    completeInitialRestore();
  }, [completeInitialRestore, initialPage, loading, numPages]);

  useEffect(() => {
    if (loading || numPages === 0) return;

    setTrackingReady(false);
    restoreDoneRef.current = false;

    if (normalizedInitialPage === 1) {
      window.requestAnimationFrame(() => completeInitialRestore());
      return;
    }

    restoreHintTimerRef.current = window.setTimeout(() => {
      scrollExactlyToPage(normalizedInitialPage);
    }, 1200);

    return () => {
      if (restoreHintTimerRef.current) {
        window.clearTimeout(restoreHintTimerRef.current);
        restoreHintTimerRef.current = null;
      }
    };
  }, [completeInitialRestore, loading, normalizedInitialPage, numPages, scrollExactlyToPage]);

  useEffect(() => {
    if (!numPages || loading || !trackingReady) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        const best = visible[0];
        if (!best) return;

        const pageIndex = Number(best.target.getAttribute('data-page-number'));
        if (!pageIndex || currentPageRef.current === pageIndex) return;

        currentPageRef.current = pageIndex;
        setCurrentPage(pageIndex);
        onPageChange?.(pageIndex, numPages);
      },
      {
        root: containerRef.current,
        threshold: [0.2, 0.35, 0.5, 0.7],
        rootMargin: '-30% 0px -30% 0px',
      }
    );

    pageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [numPages, loading, trackingReady, onPageChange]);

  useEffect(() => {
    if (!targetPage || loading || numPages === 0) return;
    const page = Math.min(Math.max(1, targetPage), numPages);
    scrollExactlyToPage(page, 'smooth');
  }, [targetPage, loading, numPages, scrollExactlyToPage]);

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
    renderedPagesRef.current = new Set();
    restoreDoneRef.current = false;
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
            {Array.from({ length: numPages }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <div
                  key={`page_${pageNumber}`}
                  ref={(el) => (pageRefs.current[index] = el)}
                  data-page-number={pageNumber}
                  className="relative shadow-lg transition-transform duration-75 ease-linear"
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer
                    renderAnnotationLayer
                    className="bg-white"
                    width={Math.min(window.innerWidth * 0.95, 800)}
                    loading={<div className="h-[800px] w-full bg-white animate-pulse" />}
                    onRenderSuccess={() => handlePageRenderSuccess(pageNumber)}
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
