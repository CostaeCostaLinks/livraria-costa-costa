import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactReader } from 'react-reader';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Type, Moon, Sun } from 'lucide-react';
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
  const onTextSelectionRef = useRef(onTextSelection);

  useEffect(() => {
    onTextSelectionRef.current = onTextSelection;
  }, [onTextSelection]);

  useEffect(() => {
    if (locationOverride) setLocation(locationOverride);
  }, [locationOverride]);

  const applyReaderTheme = useCallback((rend: any, dark: boolean, size: number) => {
    if (!rend?.themes) return;

    try {
      rend.themes.default({
        body: {
          color: dark ? '#f8fafc' : '#111827',
          background: dark ? '#0b1220' : '#ffffff',
        },
        '::selection': {
          background: '#fde68a',
        },
      });
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
        // Ignora remoção já aplicada pelo próprio EPUB.js.
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
        if (Number.isFinite(fraction)) progress = Math.min(100, Math.max(0, fraction * 100));
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

  const handleRendition = useCallback(
    (rend: any) => {
      // Limpa o listener anterior antes de trocar a rendition.
      const previous = renditionRef.current;
      if (previous && previous !== rend) {
        try {
          previous.off('selected', previous.__costaSelectionHandler);
        } catch {
          // noop
        }
      }

      renditionRef.current = rend;
      setRendition(rend);
      appliedHighlightsRef.current = new Map();

      applyReaderTheme(rend, readerDark, fontSize);

      const handleSelected = (cfiRange: string, contents: any) => {
        if (!cfiRange) return;

        try {
          const selectedText =
            rend.getRange?.(cfiRange)?.toString?.().trim?.() ||
            contents?.window?.getSelection?.()?.toString?.().trim?.() ||
            '';

          if (!selectedText) return;

          onTextSelectionRef.current?.({
            selectedText,
            position: cfiRange,
          });

          contents?.window?.getSelection?.()?.removeAllRanges?.();
        } catch {
          // Seleção inválida não deve interromper o leitor.
        }
      };

      // Guardamos a referência no próprio objeto para remover corretamente.
      rend.__costaSelectionHandler = handleSelected;
      try {
        rend.off('selected', handleSelected);
      } catch {
        // noop
      }
      rend.on('selected', handleSelected);

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

  useEffect(() => {
    return () => {
      const rend = renditionRef.current;
      if (!rend) return;
      try {
        if (rend.__costaSelectionHandler) rend.off('selected', rend.__costaSelectionHandler);
      } catch {
        // noop
      }
    };
  }, []);

  return (
    <div className="epub-container relative h-full">
      <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-[210px]">
        <div className="space-y-3 min-w-[170px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4" /> Tamanho
            </span>
            <span className="text-sm text-muted-foreground">{fontSize}%</span>
          </div>
          <Slider value={[fontSize]} onValueChange={handleFontSizeChange} min={80} max={150} step={10} />
          <Button variant="outline" size="sm" onClick={handleToggleTheme} className="w-full">
            {readerDark ? (
              <><Sun className="h-4 w-4 mr-2" />Modo Claro</>
            ) : (
              <><Moon className="h-4 w-4 mr-2" />Modo Escuro</>
            )}
          </Button>
        </div>
      </div>

      <ReactReader
        url={url}
        location={location}
        locationChanged={handleLocationChange}
        getRendition={handleRendition}
        swipeable={false}
        epubInitOptions={{
          openAs: 'epub',
        }}
        epubOptions={{
          flow: 'paginated',
          manager: 'default',
          spread: 'auto',
        }}
      />
    </div>
  );
}
