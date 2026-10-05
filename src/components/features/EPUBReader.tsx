import { useEffect, useRef, useState } from 'react';
import { ReactReader } from 'react-reader';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Type, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface EPUBReaderProps {
  url: string;
  initialLocation?: string;
  locationOverride?: string;
  onLocationChange?: (location: string, progress?: number) => void;
}

export function EPUBReader({ url, initialLocation, locationOverride, onLocationChange }: EPUBReaderProps) {
  const [location, setLocation] = useState<string | number>(initialLocation || 0);
  const [fontSize, setFontSize] = useState(100);
  const [rendition, setRendition] = useState<any>(null);
  const { theme } = useTheme();
  const renditionRef = useRef<any>(null);
  const locationsReadyRef = useRef(false);

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
          try {
            Promise.resolve(rend.book.locations.generate(1600))
              .then(() => { locationsReadyRef.current = true; })
              .catch(() => { locationsReadyRef.current = false; });
          } catch {
            locationsReadyRef.current = false;
          }
        }}
        epubOptions={{ flow: 'paginated', manager: 'continuous' }}
      />
    </div>
  );
}
