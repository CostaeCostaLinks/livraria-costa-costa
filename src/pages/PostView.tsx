import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import DOMPurify from "dompurify";
import {
  ArrowLeft, Share2, Calendar, Loader2, Type, 
  Minus, Plus, AlignLeft, AlignJustify, ChevronUp, ChevronDown, Printer, Clock
} from "lucide-react";

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, 
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function PostView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // --- ESTADOS DE LEITURA ---
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily, setFontFamily] = useState<"font-serif" | "font-sans">("font-serif");
  const [textAlign, setTextAlign] = useState<"text-left" | "text-justify">("text-left");
  const [progress, setProgress] = useState(0);

  // --- DADOS ---
  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("*").eq("id", id).single();
      return data;
    },
    enabled: !!id,
  });

  // --- LÓGICA DE SCROLL & CABEÇALHOS ---
  const articleRef = useRef<HTMLDivElement | null>(null);
  const [headings, setHeadings] = useState<{ id: string; text: string; offsetTop: number }[]>([]);
  const [currentHeadingIndex, setCurrentHeadingIndex] = useState<number>(-1);

  const processedContent = post?.content ? post.content.replace(/\n/g, "<br />") : "";

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const pct = Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100)));
    setProgress(pct);

    if (headings.length) {
        const currentPos = window.scrollY + 200; 
        let idx = -1;
        for (let i = 0; i < headings.length; i++) {
          if (headings[i].offsetTop <= currentPos) idx = i;
          else break;
        }
        setCurrentHeadingIndex(idx);
    }
  }, [headings]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Mapeia H2s e força cor escura neles
  useEffect(() => {
    if (!post) return;
    setTimeout(() => {
        const container = articleRef.current;
        if (!container) return;
        const h2s = Array.from(container.querySelectorAll("h2"));
        
        const built = h2s.map((h, i) => {
            let id = h.getAttribute("id");
            if (!id) {
                id = `section-${i + 1}`;
                h.setAttribute("id", id);
            }
            // Força classes de alto contraste nos H2s
            h.classList.add("text-2xl", "font-bold", "mt-8", "mb-4", "text-black");
            
            const rect = h.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            return { id, text: h.textContent || `Seção ${i + 1}`, offsetTop: rect.top + scrollTop };
        });
        setHeadings(built);
    }, 500);
  }, [post]);

  const goToHeading = (index: number) => {
    if (index < 0 || index >= headings.length) return;
    window.scrollTo({ top: headings[index].offsetTop - 100, behavior: "smooth" });
  };

  const handlePrint = () => window.print();
  
  const handleShare = async () => {
    if (!post) return;
    const payload = { title: post.title, text: post.title, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(payload);
      else { await navigator.clipboard.writeText(window.location.href); alert("Link copiado!"); }
    } catch (e) { console.error(e); }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-amber-600" /></div>;
  if (!post) return <div className="h-screen flex items-center justify-center flex-col gap-4"><p>Artigo não encontrado</p><Button onClick={() => navigate("/blog")}>Voltar ao Blog</Button></div>;

  return (
    <div className="min-h-screen bg-white pb-24 relative selection:bg-amber-200 selection:text-amber-900">
      
      <style>{`
        @media print {
          body { visibility: hidden; background: white !important; }
          #print-area { visibility: visible; position: absolute; left: 0; top: 0; width: 100%; }
          #print-area * { visibility: visible; }
          nav, button, .sticky, header > div > button { display: none !important; }
          .print-header { display: block !important; border-bottom: 2px solid #ddd; margin-bottom: 20px; text-align: center; }
        }
        .print-header { display: none; }
      `}</style>

      {/* BARRA DE PROGRESSO */}
      <div className="fixed left-0 right-0 top-0 z-50 pointer-events-none print:hidden">
        <div className="h-1.5 bg-gray-100">
          <div className="h-full bg-amber-500 transition-all duration-150 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* HEADER FLUTUANTE */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 h-16 flex items-center justify-between shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/blog')} className="text-slate-600 hover:text-slate-900 -ml-2">
            <ArrowLeft className="h-5 w-5 mr-1" /> <span className="hidden sm:inline">Voltar</span>
          </Button>
        </div>

        <div className="flex items-center gap-1">
           <div className="hidden md:flex items-center border-r border-slate-200 pr-2 mr-2 gap-1">
            <Button variant="ghost" size="icon" onClick={() => goToHeading(currentHeadingIndex - 1)} disabled={currentHeadingIndex <= 0} title="Seção Anterior">
              <ChevronUp className="h-5 w-5 text-slate-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => goToHeading(currentHeadingIndex + 1)} disabled={currentHeadingIndex >= headings.length - 1} title="Próxima Seção">
              <ChevronDown className="h-5 w-5 text-slate-500" />
            </Button>
          </div>

          <Button variant="ghost" size="icon" onClick={handlePrint} title="Imprimir" className="hidden sm:flex">
            <Printer className="h-5 w-5 text-slate-600" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Ajustes de Texto"><Type className="h-5 w-5 text-slate-600" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-72 p-4" align="end">
              <DropdownMenuLabel className="pb-2 text-xs uppercase text-slate-400 tracking-wider">Tamanho do Texto</DropdownMenuLabel>
              <div className="flex items-center justify-between gap-4 mb-4">
                <Button variant="outline" size="icon" onClick={() => setFontSize(s => Math.max(16, s - 2))}><Minus className="h-4 w-4" /></Button>
                <span className="font-mono text-lg">{fontSize}px</span>
                <Button variant="outline" size="icon" onClick={() => setFontSize(s => Math.min(32, s + 2))}><Plus className="h-4 w-4" /></Button>
              </div>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuLabel className="pb-2 text-xs uppercase text-slate-400 tracking-wider">Estilo</DropdownMenuLabel>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button variant={fontFamily === "font-serif" ? "default" : "outline"} onClick={() => setFontFamily("font-serif")} className="font-serif">Serifa</Button>
                <Button variant={fontFamily === "font-sans" ? "default" : "outline"} onClick={() => setFontFamily("font-sans")} className="font-sans">Sans</Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant={textAlign === "text-left" ? "secondary" : "ghost"} onClick={() => setTextAlign("text-left")}><AlignLeft className="h-4 w-4 mr-2" /> Esq.</Button>
                <Button variant={textAlign === "text-justify" ? "secondary" : "ghost"} onClick={() => setTextAlign("text-justify")}><AlignJustify className="h-4 w-4 mr-2" /> Just.</Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" onClick={handleShare} className="text-amber-600"><Share2 className="h-5 w-5" /></Button>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div id="print-area" className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="print-header mb-8">
            <h1 className="text-3xl font-bold mb-2">Costa & Costa Library</h1>
            <p className="text-sm text-gray-500">Documento gerado digitalmente</p>
        </div>

        <header className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600 mb-6 font-semibold">
                <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200"><Calendar className="h-3.5 w-3.5" /> {new Date(post.created_at).toLocaleDateString("pt-BR")}</span>
                <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200"><Clock className="h-3.5 w-3.5" /> 5 min leitura</span>
            </div>
            
            {/* Título: PRETO e FORTE */}
            <h1 className="font-serif font-black text-4xl md:text-5xl lg:text-6xl text-slate-900 leading-tight mb-6 tracking-tight">
                {post.title}
            </h1>
            
            {/* Subtítulo: Cinza Escuro e Legível */}
            {post.subtitle && (
                <p className="text-xl md:text-2xl text-slate-700 font-normal leading-relaxed max-w-2xl mx-auto">
                    {post.subtitle}
                </p>
            )}

            <div className="w-24 h-1 bg-amber-500 mx-auto mt-8 rounded-full opacity-80"></div>
        </header>

        {post.cover_url && (
            <div className="mb-12 rounded-2xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100">
                <img src={post.cover_url} alt={post.title} className="w-full h-auto object-cover" />
            </div>
        )}

        {/* PROSE CONFIGURADO PARA ALTO CONTRASTE */}
        <article
            ref={articleRef}
            className={`
                prose prose-lg md:prose-xl max-w-none 
                text-slate-900 dark:text-slate-900
                ${fontFamily} ${textAlign}
                prose-headings:font-serif prose-headings:font-bold prose-headings:!text-slate-900
                prose-p:!text-slate-800 prose-p:leading-relaxed prose-p:font-medium
                prose-li:!text-slate-800 
                prose-strong:!text-black prose-strong:font-black
                prose-a:!text-amber-700 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-4 prose-blockquote:border-amber-500 prose-blockquote:bg-amber-50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:!text-slate-800
                prose-img:rounded-xl prose-img:shadow-lg
            `}
            style={{ fontSize: `${fontSize}px` }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedContent) }}
        />
           
        <div className="mt-16 pt-10 border-t border-slate-200 text-center print:hidden">
            
            {/* NOVO BLOCO DO AUTOR */}
            <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100 text-center md:text-left flex flex-col md:flex-row items-center gap-6">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-500/20 shadow-md">
                  <img src="/cleverson-profile.jpg" alt="Cleverson Costa" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-serif font-bold text-lg mb-1 text-slate-900">Sobre o Autor</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed font-medium">
                  Cleverson Costa é especialista em Comportamento Humano, Neurociência, PNL e Vendas. 
                  Autor do livro "O Mapa das Cicatrizes" e criador do Método VAP.
                </p>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate('/links')}
                  className="w-full md:w-auto bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-0 font-bold shadow-sm"
                >
                  Ver todos os links e livros
                </Button>
              </div>
            </div>

            <h3 className="font-serif font-bold text-xl text-slate-900 mb-2">Gostou deste artigo?</h3>
            <p className="text-slate-600 mb-6 font-medium">Compartilhe conhecimento com seus amigos e familiares.</p>
            <div className="flex justify-center gap-3">
                <Button onClick={handleShare} className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6">
                    <Share2 className="h-4 w-4 mr-2" /> Compartilhar
                </Button>
            </div>
        </div>

      </div>
    </div>
  );
}