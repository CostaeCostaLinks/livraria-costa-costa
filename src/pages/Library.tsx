import { useMyLibrary } from '@/hooks/useReadingProgress';
import { BookCard } from '@/components/features/BookCard';
import { Library as LibraryIcon, BookOpen, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Library() {
  const { data: books, isLoading } = useMyLibrary();
  const navigate = useNavigate();

  // MUDANÇA: bg-slate-50
  return (
    <div className="container mx-auto px-4 py-8 space-y-8 pb-24 min-h-screen bg-slate-50">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-xl">
            <LibraryIcon className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">Minha Biblioteca</h1>
            <p className="text-sm text-slate-500 font-medium">Gerencie seu progresso e continue lendo</p>
          </div>
        </div>
        
        {books && books.length > 0 && (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-100 px-4 py-2 rounded-lg border border-slate-200">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>{books.length} livros iniciados</span>
            </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-6">
          {[...Array(6)].map((_, i) => (
            <BookCard key={i} isLoading={true} />
          ))}
        </div>
      ) : books && books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-6">
          {books.map((book: any) => (
            <BookCard 
              key={book.id} 
              book={book} 
              progress={book.progress} 
              onClick={() => navigate(`/read/${book.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm text-center px-4">
          <div className="bg-slate-50 p-6 rounded-full mb-6 animate-in fade-in zoom-in duration-500">
            <BookOpen className="h-12 w-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Sua biblioteca está vazia</h3>
          <p className="text-slate-600 mb-8 max-w-md font-medium">
            Parece que você ainda não começou nenhum livro. Explore nosso acervo e descubra sua próxima leitura.
          </p>
          <Button 
            onClick={() => navigate('/')}
            className="rounded-full px-8 bg-slate-900 hover:bg-slate-800 text-white font-medium"
          >
            Explorar Acervo
          </Button>
        </div>
      )}
    </div>
  );
}