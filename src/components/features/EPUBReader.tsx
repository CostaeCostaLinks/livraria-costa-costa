import { useState, useEffect, useRef } from 'react';
import { ReactReader } from 'react-reader';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Type, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface EPUBReaderProps {
  url: string;
  initialLocation?: string;
  onLocationChange?: (location: string) => void;
}

export function EPUBReader({ url, initialLocation, onLocationChange }: EPUBReaderProps) {
  const [location, setLocation] = useState<string | number>(initialLocation || 0);
  const [fontSize, setFontSize] = useState(100);
  const [rendition, setRendition] = useState<any>(null);
  const { theme } = useTheme();
  const renditionRef = useRef<any>(null);

  // When rendition is set, keep a ref for safe access
  useEffect(() => {
    renditionRef.current = rendition;
  }, [rendition]);

  // Apply theme whenever rendition is ready or theme changes
  useEffect(() => {
    if (!renditionRef.current) return;

    const rend = renditionRef.current;
    const themes = rend?.themes;
    if (!themes) return;

    if (theme === 'dark') {
      try {
        themes.override('color', '#ffffff');
        themes.override('background', '#0b1220'); // deep dark background
        themes.override('body', {
          'font-family': 'inherit',
        } as any);
      } catch (e) {
        // ignore if override fails
      }
    } else {
      try {
        themes.override('color', '#111827');
        themes.override('background', '#ffffff');
      } catch (e) {
        // ignore
      }
    }

    // Also re-apply font size if already tuned
    try {
      if (fontSize) {
        rend.themes.fontSize(`${fontSize}%`);
      }
    } catch (e) {
      // ignore
    }
  }, [theme, fontSize]);

  const toggleTheme = () => {
    // Theme toggling handled globally via ThemeContext (App header)
    // keep a fallback local switch (if needed)
    if (!renditionRef.current) return;
    const isDark = theme === 'dark';
    const target = isDark ? 'light' : 'dark';
    // We don't modify local theme here; App toggle will do it.
    // But apply to rendition so reader updates immediately.
    const themes = renditionRef.current?.themes;
    if (!themes) return;
    if (target === 'dark') {
      themes.override('color', '#ffffff');
      themes.override('background', '#0b0f12');
    } else {
      themes.override('color', '#111827');
      themes.override('background', '#ffffff');
    }
  };

  const handleLocationChange = (loc: string) => {
    setLocation(loc);
    if (onLocationChange) {
      onLocationChange(loc);
    }
  };

  const handleFontSizeChange = (value: number[]) => {
    const newSize = value[0];
    setFontSize(newSize);
    if (renditionRef.current) {
      try {
        renditionRef.current.themes.fontSize(`${newSize}%`);
      } catch (e) {
        // ignore
      }
    }
  };

  return (
    <div className="epub-container relative h-full">
      <div className="absolute top-4 right-4 z-10 bg-background/95 backdrop-blur border border-border rounded-lg p-4 shadow-lg">
        <div className="space-y-4 min-w-[200px]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Type className="h-4 w-4" />
              Tamanho
            </span>
            <span className="text-sm text-muted-foreground">{fontSize}%</span>
          </div>
          <Slider
            value={[fontSize]}
            onValueChange={handleFontSizeChange}
            min={80}
            max={150}
            step={10}
            className="w-full"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            className="w-full"
          >
            {theme === 'light' ? (
              <>
                <Moon className="h-4 w-4 mr-2" />
                Modo Escuro
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 mr-2" />
                Modo Claro
              </>
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
          // keep a ref updated
          renditionRef.current = rend;
        }}
        epubOptions={{
          flow: 'paginated',
          manager: 'continuous',
        }}
      />
    </div>
  );
}
