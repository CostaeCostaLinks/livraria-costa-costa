import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooks } from '@/hooks/useBooks';
import { BookCard } from '@/components/features/BookCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, Sparkles, TrendingUp } from 'lucide-react';

const CATEGORIES = [
  'Todos', 'Ficção', 'Romance', 'Fantasia', 'Suspense', 'Clássicos', 
  'Biografia', 'História', 'Ciência', 'Auto Ajuda', 'Negócios',
  'Cura Interior', 'Espiritualidade', 'Neurociência', 'Filosofia',
  'Tecnologia', 'Arte', 'Saúde', 'HQs', 'Infantil', 'Poesia', 'Educação'
];

export default function Home() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: books, isLoading } = useBooks(
    selectedCategory === 'Todos' ? undefined : selectedCategory
  );

  const filteredBooks = books?.filter((book) =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // MUDANÇA: bg-gray-50/50 -> bg-slate-50 (Mais limpo)
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="relative bg-slate-900 text-white overflow-hidden mb-10">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-slate-800/50 to-transparent"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3 h-3" /> Biblioteca Digital
            </div>
            
            <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight text-white mb-4">
              Explore novos mundos <br/>
              <span className="text-slate-400">sem sair de casa.</span>
            </h1>

            <div className="max-w-xl mx-auto my-8 border-l-4 border-amber-500 pl-4 py-1 text-left bg-white/5 rounded-r-lg">
              <p className="font-serif text-lg text-slate-200 italic leading-relaxed">
                "Transformai-vos pela renovação da vossa mente"
              </p>
              <cite className="block mt-2 text-xs font-medium text-amber-500 not-italic tracking-widest uppercase">
                — Romanos 12:2
              </cite>
            </div>

            <div className="max-w-xl mx-auto relative mt-8">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <Input
                  type="text"
                  placeholder="Buscar por título, autor ou assunto..."
                  className="pl-12 h-14 rounded-full bg-white text-slate-900 border-0 shadow-2xl focus-visible:ring-2 focus-visible:ring-amber-500 text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 space-y-12">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              Explorar por Categorias
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                size="sm"
                className={`rounded-full border transition-all ${
                  selectedCategory === category 
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-900' 
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 font-medium'
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
            <h2 className="text-2xl font-serif font-bold text-slate-900">
              {searchTerm ? `Resultados para "${searchTerm}"` : 'Acervo Completo'}
            </h2>
            <span className="text-sm text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded-md">
              {filteredBooks?.length || 0} títulos
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-6">
              {[...Array(12)].map((_, i) => (
                <BookCard key={i} isLoading={true} />
              ))}
            </div>
          ) : filteredBooks && filteredBooks.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-6">
              {filteredBooks.map((book) => (
                <BookCard 
                  key={book.id} 
                  book={book} 
                  onClick={() => navigate(`/read/${book.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum livro encontrado</h3>
              <p className="text-sm text-slate-500">
                Tente ajustar sua busca ou mudar a categoria selecionada.
              </p>
              {selectedCategory !== 'Todos' && (
                <Button 
                  variant="link" 
                  onClick={() => setSelectedCategory('Todos')}
                  className="mt-4 text-amber-600 font-bold"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}