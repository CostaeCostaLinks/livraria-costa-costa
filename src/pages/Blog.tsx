import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Calendar, ArrowRight, Sparkles } from 'lucide-react';

export default function Blog() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const filteredPosts = posts?.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getExcerpt = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* --- HERO SECTION --- */}
      <div className="relative bg-slate-900 text-white overflow-hidden mb-12">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-900/20 to-transparent"></div>
        
        <div className="container mx-auto px-4 py-16 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3 h-3 text-emerald-400" /> Blog & Insights
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight mb-4">
            Conhecimento que <span className="text-emerald-400">Transforma</span>
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-lg">
            Artigos sobre liderança, desenvolvimento pessoal e a ciência da mente.
          </p>

          <div className="max-w-md mx-auto mt-8 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar artigos..." 
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-emerald-500 rounded-full h-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* --- LISTA DE ARTIGOS --- */}
      <div className="container mx-auto px-4 max-w-6xl">
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <div key={i} className="h-96 bg-slate-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : filteredPosts && filteredPosts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <article 
                key={post.id} 
                className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 hover:-translate-y-1"
              >
                <div className="h-48 overflow-hidden bg-slate-100 relative">
                  {post.cover_url ? (
                    <img 
                      src={post.cover_url} 
                      alt={post.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-6">
                      <h3 className="text-white/20 font-serif text-4xl font-bold opacity-50 select-none">C&C</h3>
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                     <span className="bg-white/90 backdrop-blur text-slate-900 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide shadow-sm">
                        Artigo
                     </span>
                  </div>
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 mb-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {/* Título Forte */}
                  <h2 className="text-xl font-extrabold text-slate-900 mb-3 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                    {post.title}
                  </h2>
                  
                  {/* Resumo Legível */}
                  <p className="text-slate-700 text-sm font-medium line-clamp-3 mb-6 flex-1 leading-relaxed">
                    {post.subtitle || getExcerpt(post.content).slice(0, 150) + "..."}
                  </p>
                  
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between hover:bg-emerald-50 hover:text-emerald-800 text-slate-900 font-bold group/btn"
                    onClick={() => navigate(`/blog/${post.id}`)}
                  >
                    Ler completo <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-500">Nenhum artigo encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}