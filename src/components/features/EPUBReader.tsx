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
  const appliedHighlightCfisRef = useRef<Set<string>>(new Set());
  const onTextSelectionRef = useRef(onTextSelection);
  const readerDarkRef = useRef(readerDark);
  const fontSizeRef = useRef(fontSize);

  useEffect(() => {
    onTextSelectionRef.current = onTextSelection;
  }, [onTextSelection]);

  useEffect(() => {
    readerDarkRef.current = readerDark;
  }, [readerDark]);

  useEffect(() => {
    fontSizeRef.current = fontSize;
  }, [fontSize]);

  useEffect(() => {
    if (locationOverride) setLocation(locationOverride);
  }, [locationOverride]);

  const styleContents = useCallback((contents: any, dark: boolean, size: number) => {
    const doc = contents?.document;
    if (!doc) return;

    const color = dark ? '#f8fafc' : '#111827';
    const background = dark ? '#0b1220' : '#ffffff';

    let style = doc.getElementById('costa-reader-theme') as HTMLStyleElement | null;
    if (!style) {
      style = doc.createElement('style');
      style.id = 'costa-reader-theme';
      doc.head?.appendChild(style);
    }

    style.textContent = `
      html, body {
        background: ${background} !important;
        background-color: ${background} !important;
        color: ${color} !important;
      }
      body, body p, body div, body span, body li,
      body h1, body h2, body h3, body h4, body h5, body h6,
      body blockquote, body strong, body em, body b, body i {
        color: ${color} !important;
      }
      html, body, body * {
        -webkit-user-select: text !important;
        user-select: text !important;
      }
      body {
        cursor: text !important;
      }
      ::selection {
        background: rgba(253, 224, 71, 0.62) !important;
        color: #111827 !important;
      }
    `;

    try {
      doc.documentElement.style.setProperty('background', background, 'important');
      doc.body?.style.setProperty('background', background, 'important');
      doc.body?.style.setProperty('color', color, 'important');
      doc.body?.style.setProperty('font-size', `${size}%`, 'important');
      doc.documentElement.style.setProperty('user-select', 'text', 'important');
      doc.documentElement.style.setProperty('-webkit-user-select', 'text', 'important');
      doc.body?.style.setProperty('user-select', 'text', 'important');
      doc.body?.style.setProperty('-webkit-user-select', 'text', 'important');
    } catch {
      // noop
    }
  }, []);

  const installSelectionCapture = useCallback((contents: any) => {
    const doc = contents?.document;
    if (!doc || contents.__costaSelectionCaptureInstalled) return;
    contents.__costaSelectionCaptureInstalled = true;

    let selectionTimer: number | null = null;
    let lastCfi = '';

    const capture = () => {
      if (selectionTimer !== null) window.clearTimeout(selectionTimer);

      selectionTimer = window.setTimeout(() => {
        try {
          const selection = contents.window?.getSelection?.();
          if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

          const selectedText = selection.toString().trim();
          if (!selectedText) return;

          const range = selection.getRangeAt(0).cloneRange();
          const cfiRange = contents.cfiFromRange?.(range);
          if (!cfiRange || cfiRange === lastCfi) return;

          lastCfi = cfiRange;
          onTextSelectionRef.current?.({
            selectedText,
            position: cfiRange,
          });
        } catch {
          // Uma seleção inválida não deve interromper a leitura.
        }
      }, 180);
    };

    doc.addEventListener('selectionchange', capture, true);
    doc.addEventListener('mouseup', capture, true);
    doc.addEventListener('pointerup', capture, true);
    doc.addEventListener('touchend', capture, true);
  }, []);

  const prepareContents = useCallback(
    (contents: any) => {
      if (!contents) return;
      styleContents(contents, readerDarkRef.current, fontSizeRef.current);
      installSelectionCapture(contents);
    },
    [installSelectionCapture, styleContents]
  );

  const applyReaderTheme = useCallback(
    (rend: any, dark: boolean, size: number) => {
      if (!rend) return;

      try {
        rend.themes?.fontSize?.(`${size}%`);
      } catch {
        // noop
      }

      try {
        const visibleContents = rend.getContents?.() || [];
        visibleContents.forEach((contents: any) => styleContents(contents, dark, size));
      } catch {
        // noop
      }
    },
    [styleContents]
  );

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

    // Reconstrói a camada de highlights a partir do banco.
    // Isso é mais confiável no EPUB porque as views são recriadas ao paginar,
    // alterar fonte, alternar tema ou redimensionar a janela.
    appliedHighlightCfisRef.current.forEach((cfiRange) => {
      try {
        rend.annotations.remove(cfiRange, 'highlight');
      } catch {
        // noop
      }
    });
    appliedHighlightCfisRef.current.clear();

    epubHighlights.forEach((highlight) => {
      try {
        rend.annotations.highlight(
          highlight.position,
          { highlightId: highlight.id },
          undefined,
          `reader-highlight-${highlight.color}`,
          epubHighlightStyles[highlight.color] || epubHighlightStyles.yellow
        );
        appliedHighlightCfisRef.current.add(highlight.position);
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
    fontSizeRef.current = newSize;
    setFontSize(newSize);
    applyReaderTheme(renditionRef.current, readerDarkRef.current, newSize);
    window.setTimeout(syncHighlights, 120);
  };

  const handleTextSelected = useCallback((cfiRange: string, contents: any) => {
    if (!cfiRange) return;

    try {
      const selectedText =
        contents?.window?.getSelection?.()?.toString?.().trim?.() ||
        renditionRef.current?.getRange?.(cfiRange)?.toString?.().trim?.() ||
        '';

      if (!selectedText) return;

      onTextSelectionRef.current?.({
        selectedText,
        position: cfiRange,
      });

      contents?.window?.getSelection?.()?.removeAllRanges?.();
    } catch {
      // noop
    }
  }, []);

  const handleRendition = useCallback(
    (rend: any) => {
      renditionRef.current = rend;
      setRendition(rend);
      appliedHighlightCfisRef.current = new Set();

      const handleRendered = (_section: any, view: any) => {
        const contents = view?.contents;
        prepareContents(contents);
        window.setTimeout(syncHighlights, 0);
      };

      try {
        rend.on('rendered', handleRendered);
      } catch {
        // noop
      }

      try {
        const visibleContents = rend.getContents?.() || [];
        visibleContents.forEach((contents: any) => prepareContents(contents));
      } catch {
        // noop
      }

      applyReaderTheme(rend, readerDarkRef.current, fontSizeRef.current);

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

      window.setTimeout(syncHighlights, 80);
    },
    [applyReaderTheme, prepareContents, syncHighlights]
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

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={readerDark ? 'outline' : 'default'}
              size="sm"
              onClick={() => {
                readerDarkRef.current = false;
                setReaderDark(false);
                applyReaderTheme(renditionRef.current, false, fontSizeRef.current);
                window.setTimeout(syncHighlights, 120);
              }}
            >
              <Sun className="h-4 w-4 mr-1" /> Claro
            </Button>
            <Button
              variant={readerDark ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                readerDarkRef.current = true;
                setReaderDark(true);
                applyReaderTheme(renditionRef.current, true, fontSizeRef.current);
                window.setTimeout(syncHighlights, 120);
              }}
            >
              <Moon className="h-4 w-4 mr-1" /> Escuro
            </Button>
          </div>
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
