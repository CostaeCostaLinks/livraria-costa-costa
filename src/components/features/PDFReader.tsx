import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Loader2, ZoomIn, ZoomOut, ArrowUpToLine } from 'lucide-react';
import type { ReadingHighlight } from '@/hooks/useReadingHighlights';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export interface PDFTextSelection {
  selectedText: string;
  pageNumber: number;
  position: string;
  anchor: {
    rects: Array<{ x: number; y: number; w: number; h: number }>;
  };
}

interface PDFReaderProps {
  url: string;
  initialPage?: number;
  onPageChange?: (page: number, total: number) => void;
  targetPage?: number;
  highlights?: ReadingHighlight[];
  onTextSelection?: (selection: PDFTextSelection) => void;
}

const highlightColors: Record<string, string> = {
  yellow: 'rgba(250, 204, 21, 0.42)',
  green: 'rgba(74, 222, 128, 0.38)',
  blue: 'rgba(96, 165, 250, 0.36)',
  pink: 'rgba(244, 114, 182, 0.36)',
};

export function PDFReader({
  url,
  initialPage = 1,
  onPageChange,
  targetPage,
  highlights = [],
  onTextSelection,
}: PDFReaderProps) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [trackingReady, setTrackingReady] = useState(false);

  const pdfHighlightsByPage = useMemo(() => {
    const grouped = new Map<number, ReadingHighlight[]>();

    highlights.forEach((highlight) => {
      if (highlight.format !== 'pdf' || !highlight.page_number) return;
      const list = grouped.get(highlight.page_number) || [];
      list.push(highlight);
      grouped.set(highlight.page_number, list);
    });

    return grouped;
  }, [highlights]);

  const pageNumbers = useMemo(
    () => Array.from({ length: numPages }, (_, index) => index + 1),
    [numPages]
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentPageRef = useRef(initialPage);
  const restoreTimersRef = useRef<number[]>([]);
  const scrollFrameRef = useRef<number | null>(null);
  const lastTargetPageRef = useRef<number | null>(null);
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

    [0, 250, 700, 1400].forEach((delay) => {
      const timer = window.setTimeout(() => {
        scrollExactlyToPage(target);
      }, delay);
      restoreTimersRef.current.push(timer);
    });

    const enableTimer = window.setTimeout(() => {
      setTrackingReady(true);
    }, 1750);
    restoreTimersRef.current.push(enableTimer);

    return clearRestoreTimers;
  }, [clearRestoreTimers, initialPage, loading, numPages, scrollExactlyToPage]);

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
    if (lastTargetPageRef.current === page) return;

    lastTargetPageRef.current = page;
    scrollExactlyToPage(page, 'smooth');

    const timer = window.setTimeout(() => {
      detectCurrentPage();
    }, 500);

    return () => window.clearTimeout(timer);
  }, [detectCurrentPage, loading, numPages, scrollExactlyToPage, targetPage]);

  useEffect(() => {
    if (!targetPage) lastTargetPageRef.current = null;
  }, [targetPage]);

  useEffect(() => {
    if (!trackingReady) return;
    const timer = window.setTimeout(detectCurrentPage, 180);
    return () => window.clearTimeout(timer);
  }, [detectCurrentPage, scale, trackingReady]);

  const handleTextSelection = useCallback(() => {
    if (!onTextSelection) return;
    window.setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;

      const selectedText = selection.toString().trim();
      if (!selectedText) return;

      const range = selection.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
      const pageElement = element?.closest('[data-page-number]') as HTMLElement | null;
      if (!pageElement || !containerRef.current?.contains(pageElement)) return;

      const pageNumber = Number(pageElement.dataset.pageNumber);
      if (!pageNumber) return;

      const pageRect = pageElement.getBoundingClientRect();
      const rects = Array.from(range.getClientRects())
        .filter((rect) => rect.width > 1 && rect.height > 1)
        .map((rect) => ({
          x: (rect.left - pageRect.left) / pageRect.width,
          y: (rect.top - pageRect.top) / pageRect.height,
          w: rect.width / pageRect.width,
          h: rect.height / pageRect.height,
        }))
        .filter((rect) => rect.x >= -0.02 && rect.y >= -0.02 && rect.x <= 1.02 && rect.y <= 1.02);

      if (!rects.length) return;

      onTextSelection({
        selectedText,
        pageNumber,
        position: `page:${pageNumber}`,
        anchor: { rects },
      });

      selection.removeAllRanges();
    }, 0);
  }, [onTextSelection]);

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
        setScale((s) => Math.min(Math.max(0.5, s + (delta > 0 ? 0.05 : -0.05)), 3));
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

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4"
        style={{ touchAction: 'pan-y' }}
        onMouseUp={handleTextSelection}
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
            {pageNumbers.map((pageNumber, index) => {
              const pageHighlights = pdfHighlightsByPage.get(pageNumber) || [];

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

                  <div className="absolute inset-0 pointer-events-none z-20" aria-hidden="true">
                    {pageHighlights.flatMap((highlight) => {
                      const rects = Array.isArray((highlight.anchor as { rects?: unknown[] })?.rects)
                        ? ((highlight.anchor as { rects: Array<{ x: number; y: number; w: number; h: number }> }).rects)
                        : [];
                      return rects.map((rect, rectIndex) => (
                        <span
                          key={`${highlight.id}-${rectIndex}`}
                          className="absolute rounded-[2px]"
                          style={{
                            left: `${rect.x * 100}%`,
                            top: `${rect.y * 100}%`,
                            width: `${rect.w * 100}%`,
                            height: `${rect.h * 100}%`,
                            background: highlightColors[highlight.color] || highlightColors.yellow,
                            mixBlendMode: 'multiply',
                          }}
                        />
                      ));
                    })}
                  </div>

                  <div className="absolute bottom-2 right-2 z-30 text-[10px] text-gray-400 bg-white/90 px-1 rounded border">
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
        onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
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
