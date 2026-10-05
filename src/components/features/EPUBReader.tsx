import { useCallback, useEffect, useRef, useState } from 'react';
import { EpubView } from 'react-reader';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronLeft, ChevronRight, Loader2, Moon, Sun, Type } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ReadingHighlight } from '@/hooks/useReadingHighlights';

export interface EPUBTextSelection {
  selectedText: string;
  position: string;
}

interface EPUBReaderProps {
  url: string;
  initialLocation?: string;
  locationOverride?: string;
  onLocationChange?: (location: string, progress?: number) => void;
  highlights?: ReadingHighlight[];
  onTextSelection?: (selection: EPUBTextSelection) => void;
}

const epubHighlightStyles: Record<string, Record<string, string>> = {
  yellow: { fill: '#fde047', 'fill-opacity': '0.45', 'mix-blend-mode': 'multiply' },
  green: { fill: '#86efac', 'fill-opacity': '0.42', 'mix-blend-mode': 'multiply' },
  blue: { fill: '#93c5fd', 'fill-opacity': '0.40', 'mix-blend-mode': 'multiply' },
  pink: { fill: '#f9a8d4', 'fill-opacity': '0.40', 'mix-blend-mode': 'multiply' },
};

const viewStyles = {
  viewHolder: {
    position: 'relative' as const,
    height: '100%',
    width: '100%',
    overflow: 'hidden',
  },
  view: {
    height: '100%',
    width: '100%',
  },
};

export function EPUBReader({
  url,
  initialLocation,
  locationOverride,
  onLocationChange,
  highlights = [],
  onTextSelection,
}: EPUBReaderProps) {
  const [location, setLocation] = useState<string | number>(initialLocation || 0);
  const [fontSize, setFontSize] = useState(100);
  const [rendition, setRendition] = useState<any>(null);
  const { theme } = useTheme();
  const [readerDark, setReaderDark] = useState(theme === 'dark');

  const renditionRef = useRef<any>(null);
  const locationsReadyRef = useRef(false);
  const appliedHighlightsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (locationOverride) setLocation(locationOverride);
  }, [locationOverride]);

  const applyReaderTheme = useCallback((rend: any, dark: boolean, size: number) => {
    if (!rend?.themes) return;

    try {
      rend.themes.register('costa-light', {
        body: {
          color: '#111827 !important',
          background: '#ffffff !important',
          'background-color': '#ffffff !important',
        },
        '::selection': {
          background: 'rgba(253, 224, 71, 0.55)',
        },
      });

      rend.themes.register('costa-dark', {
        body: {
          color: '#f8fafc !important',
          background: '#0b1220 !important',
          'background-color': '#0b1220 !important',
        },
        '::selection': {
          background: 'rgba(253, 224, 71, 0.55)',
        },
      });

      rend.themes.select(dark ? 'costa-dark' : 'costa-light');
      rend.themes.fontSize(`${size}%`);
    } catch {
      // Alguns EPUBs limitam customizações; a leitura continua normalmente.
    }
  }, []);

  useEffect(() => {
    if (!rendition) return;
    applyReaderTheme(rendition, readerDark, fontSize);
  }, [applyReaderTheme, fontSize, readerDark, rendition]);

  const syncHighlights = useCallback(() => {
    const rend = renditionRef.current;
    if (!rend?.annotations) return;

    const epubHighlights = highlights.filter(
      (highlight) =>
        highlight.format === 'epub' &&
        typeof highlight.position === 'string' &&
        highlight.position.length > 0
    );

    const desiredIds = new Set(epubHighlights.map((highlight) => highlight.id));

    appliedHighlightsRef.current.forEach((cfiRange, id) => {
      if (desiredIds.has(id)) return;
      try {
        rend.annotations.remove(cfiRange, 'highlight');
      } catch {
        // noop
      }
      appliedHighlightsRef.current.delete(id);
    });

    epubHighlights.forEach((highlight) => {
      if (appliedHighlightsRef.current.has(highlight.id)) return;

      try {
        rend.annotations.add(
          'highlight',
          highlight.position,
          { highlightId: highlight.id },
          undefined,
          `reader-highlight-${highlight.color}`,
          epubHighlightStyles[highlight.color] || epubHighlightStyles.yellow
        );
        appliedHighlightsRef.current.set(highlight.id, highlight.position);
      } catch {
        // Um CFI inválido não deve interromper a leitura.
      }
    });
  }, [highlights]);

  useEffect(() => {
    syncHighlights();
  }, [rendition, syncHighlights]);

  const handleLocationChange = (loc: string) => {
    setLocation(loc);
    let progress: number | undefined;

    try {
      const bookLocations = renditionRef.current?.book?.locations;
      if (locationsReadyRef.current && bookLocations) {
        const fraction = bookLocations.percentageFromCfi(loc);
        if (Number.isFinite(fraction)) {
          progress = Math.min(100, Math.max(0, fraction * 100));
        }
      }
    } catch {
      // CFI inválido ou locations ainda não geradas: salvamos a posição mesmo sem percentual.
    }

    onLocationChange?.(loc, progress);
  };

  const handleFontSizeChange = (value: number[]) => {
    const newSize = value[0];
    setFontSize(newSize);
    applyReaderTheme(renditionRef.current, readerDark, newSize);
  };

  const handleToggleTheme = () => {
    const nextDark = !readerDark;
    setReaderDark(nextDark);
    applyReaderTheme(renditionRef.current, nextDark, fontSize);
  };

  const handleTextSelected = useCallback(
    (cfiRange: string, contents: any) => {
      if (!cfiRange || !onTextSelection) return;

      try {
        const selectedText =
          contents?.window?.getSelection?.()?.toString?.().trim?.() ||
          renditionRef.current?.getRange?.(cfiRange)?.toString?.().trim?.() ||
          '';

        if (!selectedText) return;

        onTextSelection({
          selectedText,
          position: cfiRange,
        });

        contents?.window?.getSelection?.()?.removeAllRanges?.();
      } catch {
        // Seleção inválida não deve interromper o leitor.
      }
    },
    [onTextSelection]
  );

  const handleRendition = useCallback(
    (rend: any) => {
      renditionRef.current = rend;
      setRendition(rend);
      appliedHighlightsRef.current = new Map();

      applyReaderTheme(rend, readerDark, fontSize);

      try {
        Promise.resolve(rend.book.locations.generate(1600))
          .then(() => {
            locationsReadyRef.current = true;
          })
          .catch(() => {
            locationsReadyRef.current = false;
          });
      } catch {
        locationsReadyRef.current = false;
      }

      window.setTimeout(syncHighlights, 50);
    },
    [applyReaderTheme, fontSize, readerDark, syncHighlights]
  );

  return (
    <div className={`relative h-full overflow-hidden ${readerDark ? 'bg-[#0b1220]' : 'bg-white'}`}>
      <div className="absolute top-4 right-4 z-30 bg-background/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-[210px]">
        <div className="space-y-3 min-w-[170px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4" /> Tamanho
            </span>
            <span className="text-sm text-muted-foreground">{fontSize}%</span>
          </div>

          <Slider
            value={[fontSize]}
            onValueChange={handleFontSizeChange}
            min={80}
            max={150}
            step={10}
          />

          <Button variant="outline" size="sm" onClick={handleToggleTheme} className="w-full">
            {readerDark ? (
              <><Sun className="h-4 w-4 mr-2" />Modo Claro</>
            ) : (
              <><Moon className="h-4 w-4 mr-2" />Modo Escuro</>
            )}
          </Button>
        </div>
      </div>

      <div className="absolute inset-0 z-10 px-8 sm:px-12">
        <EpubView
          url={url}
          location={location}
          locationChanged={handleLocationChange}
          getRendition={handleRendition}
          handleTextSelected={handleTextSelected}
          epubViewStyles={viewStyles}
          loadingView={
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          }
          errorView={
            <div className="h-full flex items-center justify-center text-sm text-destructive">
              Não foi possível abrir este EPUB.
            </div>
          }
          epubInitOptions={{
            openAs: 'epub',
          }}
          epubOptions={{
            flow: 'paginated',
            manager: 'default',
            spread: 'auto',
            allowScriptedContent: false,
          }}
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-20 h-12 w-9"
        onClick={() => renditionRef.current?.prev?.()}
        aria-label="Página anterior"
      >
        <ChevronLeft className="h-7 w-7" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-20 h-12 w-9"
        onClick={() => renditionRef.current?.next?.()}
        aria-label="Próxima página"
      >
        <ChevronRight className="h-7 w-7" />
      </Button>
    </div>
  );
}
