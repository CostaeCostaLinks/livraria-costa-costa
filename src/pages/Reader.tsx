import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Loader2, ZoomIn, ZoomOut, ArrowUpToLine, ExternalLink, ArrowLeft } from "lucide-react";

// IMPORTS IMPORTANTES:
// Verifique se os caminhos abaixo batem com suas pastas. 
// Assumi que useBook está em 'hooks' e EPUBReader em 'components'.
import { useBook } from "@/hooks/useBooks"; // Hook para buscar dados
import { EPUBReader } from "@/components/features/EPUBReader"; // Se der erro, tente "@/components/features/EPUBReader"

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configuração do PDF Worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ============================================================================
// 1. COMPONENTE INTERNO: VISUALIZADOR DE PDF
// (Este é o código que já funcionava, agora isolado para ser usado pela página)
// ============================================================================
function InternalPDFViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchRef = useRef<{ dist: number } | null>(null);

  useEffect(() => {
    if (!url) {
      setErrorMsg("URL inválida do PDF.");
      setIsAvailable(false);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setErrorMsg(null);
    setIsAvailable(null);

    // Verifica se o arquivo existe
    (async () => {
      try {
        const res = await fetch(url, { method: "HEAD" });
        if (!mounted) return;
        if (res.ok) {
          setIsAvailable(true);
        } else {
          // Fallback para GET com range se HEAD falhar
          const r2 = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1023" } });
          if (!mounted) return;
          if (r2.ok || r2.status === 206) setIsAvailable(true);
          else {
            setIsAvailable(false);
            setErrorMsg(`Arquivo indisponível (HTTP ${r2.status})`);
          }
        }
      } catch (e) {
        // Tentativa final ignorando erros de rede iniciais (CORS/etc)
        setIsAvailable(true); 
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [url]);

  // Gestos de Zoom (Touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      touchRef.current = { dist };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current) {
      const dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      const delta = dist - touchRef.current.dist;
      if (Math.abs(delta) > 20) {
        setScale((s) => Math.min(Math.max(0.5, s + (delta > 0 ? 0.05 : -0.05)), 3.0));
        touchRef.current = { dist };
      }
    }
  };

  if (loading && isAvailable === null) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (isAvailable === false) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <p className="mb-4 font-semibold text-red-500">Erro ao carregar documento</p>
        <p className="text-sm text-muted-foreground mb-4">{errorMsg}</p>
        <Button variant="outline" onClick={() => window.open(url, "_blank")}>Abrir Externamente <ExternalLink className="ml-2 h-4 w-4"/></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/50 relative overflow-hidden">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 scroll-smooth"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { touchRef.current = null; }}
      >
        <div className="flex flex-col items-center gap-6 min-h-[300px]">
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoading(false); }}
            onLoadError={() => { setErrorMsg("Erro ao processar PDF"); setLoading(false); }}
            loading={<div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin" /></div>}
            className="flex flex-col items-center gap-6 w-full"
          >
            {Array.from(new Array(numPages), (_, index) => (
              <div key={`page_${index + 1}`} className="relative shadow-md rounded-sm bg-white overflow-hidden">
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  width={Math.min(window.innerWidth * 0.95, 800)}
                  loading={<div className="h-[600px] w-full bg-gray-100 animate-pulse" />}
                />
                <span className="absolute bottom-1 right-2 text-[10px] bg-black/50 text-white px-1.5 rounded">{index + 1}</span>
              </div>
            ))}
          </Document>
        </div>
      </div>

      {/* Barra de Ferramentas Inferior */}
      <div className="bg-background border-t p-3 flex items-center justify-center gap-4 z-20 shadow-lg">
        <div className="flex items-center gap-2 bg-muted rounded-full px-1 border">
          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}><ZoomOut className="h-4 w-4"/></Button>
          <span className="text-xs font-mono w-10 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(3.0, s + 0.1))}><ZoomIn className="h-4 w-4"/></Button>
        </div>
        <Button variant="outline" size="icon" onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}><ArrowUpToLine className="h-4 w-4"/></Button>
      </div>
    </div>
  );
}

// ============================================================================
// 2. COMPONENTE DA PÁGINA (EXPORT DEFAULT)
// (Este é o "Cérebro" que busca os dados e escolhe o leitor certo)
// ============================================================================
export default function ReaderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // 1. Busca os dados do livro no Supabase usando o ID
  const { data: book, isLoading } = useBook(id || "");

  // 2. Loading da Página
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3 font-medium text-muted-foreground">Abrindo livro...</span>
      </div>
    );
  }

  // 3. Tratamento de Erro (Livro não encontrado)
  if (!book || !book.file_url) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-xl font-semibold text-foreground">Livro não encontrado</p>
        <p className="text-muted-foreground">O arquivo solicitado não existe ou foi removido.</p>
        <Button onClick={() => navigate(-1)} variant="default">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Biblioteca
        </Button>
      </div>
    );
  }

  // 4. Se for EPUB, usa o EPUBReader
  // Verifica se o tipo é epub explicitamente ou pelo mimetype
  const isEpub = book.file_type === 'epub' || book.file_type?.includes('epub');

  if (isEpub) {
    return (
      <div className="h-screen w-full relative bg-background">
        {/* Botão de Voltar Flutuante */}
        <div className="absolute top-4 left-4 z-50">
          <Button 
            variant="secondary" 
            size="icon" 
            className="shadow-md opacity-80 hover:opacity-100 transition-opacity rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Renderiza o Leitor EPUB */}
        <EPUBReader url={book.file_url} initialLocation={book.last_location} />
      </div>
    );
  }

  // 5. Caso contrário (PDF), usa o InternalPDFViewer
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Cabeçalho Simples para PDF */}
      <div className="flex items-center gap-3 border-b border-border p-2 bg-background/95 backdrop-blur z-30 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-semibold text-sm line-clamp-1">{book.title}</h1>
          <p className="text-[10px] text-muted-foreground line-clamp-1">{book.author}</p>
        </div>
      </div>
      
      {/* Renderiza o Leitor PDF */}
      <InternalPDFViewer url={book.file_url} />
    </div>
  );
}