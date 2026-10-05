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
  const renditionRef = useRef<any>(null);
  const locationsReadyRef = useRef(false);
  const appliedHighlightsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    renditionRef.current = rendition;
  }, [rendition]);

  useEffect(() => {
    if (locationOverride) setLocation(locationOverride);
  }, [locationOverride]);

  useEffect(() => {
    if (!renditionRef.current) return;
    const rend = renditionRef.current;
    const themes = rend?.themes;
    if (!themes) return;

    try {
      if (theme === 'dark') {
        themes.override('color', '#ffffff');
        themes.override('background', '#0b1220');
      } else {
        themes.override('color', '#111827');
        themes.override('background', '#ffffff');
      }
      themes.fontSize(`${fontSize}%`);
    } catch {
      // Alguns EPUBs limitam customizações de estilo; a leitura continua normalmente.
    }
  }, [theme, fontSize, rendition]);

  const syncHighlights = useCallback(() => {
    const rend = renditionRef.current;
    if (!rend?.annotations) return;

    const epubHighlights = highlights.filter(
      (highlight) => highlight.format === 'epub' && typeof highlight.position === 'string' && highlight.position.length > 0
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
        rend.annotations.highlight(
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

  useEffect(() => {
    const rend = renditionRef.current;
    if (!rend || !onTextSelection) return;

    const handleSelected = (cfiRange: string, contents: any) => {
      try {
        const selection = contents?.window?.getSelection?.();
        const selectedText = selection?.toString?.().trim?.() || '';
        if (!selectedText || !cfiRange) return;

        onTextSelection({
          selectedText,
          position: cfiRange,
        });

        selection?.removeAllRanges?.();
      } catch {
        // A seleção pode vir de um conteúdo isolado do EPUB. Falhas aqui não quebram o leitor.
      }
    };

    rend.on('selected', handleSelected);
    return () => {
      try {
        rend.off('selected', handleSelected);
      } catch {
        // noop
      }
    };
  }, [onTextSelection, rendition]);

  const toggleTheme = () => {
    if (!renditionRef.current) return;
    const themes = renditionRef.current?.themes;
    if (!themes) return;
    try {
      if (theme === 'light') {
        themes.override('color', '#ffffff');
        themes.override('background', '#0b1220');
      } else {
        themes.override('color', '#111827');
        themes.override('background', '#ffffff');
      }
    } catch {
      // Mantém o leitor funcional mesmo se o EPUB bloquear overrides.
    }
  };

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
    try {
      renditionRef.current?.themes?.fontSize(`${newSize}%`);
    } catch {
      // noop
    }
  };

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
          <Button variant="outline" size="sm" onClick={toggleTheme} className="w-full">
            {theme === 'light' ? (
              <><Moon className="h-4 w-4 mr-2" />Modo Escuro</>
            ) : (
              <><Sun className="h-4 w-4 mr-2" />Modo Claro</>
            )}
          </Button>
        </div>
      </div>

      <ReactReader
        url={url}
        location={location}
        locationChanged={handleLocationChange}
        getRendition={(rend) => {
          setRendition(rend);
          renditionRef.current = rend;
          appliedHighlightsRef.current = new Map();

          try {
            Promise.resolve(rend.book.locations.generate(1600))
              .then(() => { locationsReadyRef.current = true; })
              .catch(() => { locationsReadyRef.current = false; });
          } catch {
            locationsReadyRef.current = false;
          }

          window.setTimeout(syncHighlights, 0);
        }}
        epubOptions={{ flow: 'paginated', manager: 'continuous' }}
      />
    </div>
  );
}
