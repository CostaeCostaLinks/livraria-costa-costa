import { useState } from 'react';
import { BookOpen, PlayCircle, FileText } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string | null;
  file_type: string;
  progress?: number;
  last_position?: string | null;
  last_read_at?: string | null;
}

interface BookCardProps {
  book?: Book;
  progress?: number;
  onClick?: (book: Book) => void;
  isLoading?: boolean;
  imagePriority?: boolean;
}

export function BookCard({ book, progress, onClick, isLoading = false, imagePriority = false }: BookCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  if (isLoading || !book) {
    return (
      <div className="flex flex-col h-full space-y-3 animate-pulse">
        <div className="aspect-[2/3] w-full bg-slate-200 rounded-xl" />
        <div className="space-y-2 px-1">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const currentProgress = progress || book.progress || 0;

  const getOptimizedImageUrl = (url: string) => {
    if (url.includes('supabase.co') && !url.includes('?')) {
      return `${url}?width=500&resize=cover&quality=90`;
    }
    return url;
  };

  return (
    <div 
      className="group relative flex flex-col h-full cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      onClick={() => onClick?.(book)}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onClick) {
          event.preventDefault();
          onClick(book);
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${currentProgress > 0 ? 'Continuar' : 'Ler'} ${book.title}, de ${book.author}` : undefined}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-slate-100 shadow-md transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:shadow-slate-900/10 border border-slate-200/60">
        {book.cover_url ? (
          <img 
            src={getOptimizedImageUrl(book.cover_url)} 
            alt={book.title}
            className={`h-full w-full object-cover transition-all duration-700 ease-out ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            }`}
            loading={imagePriority ? 'eager' : 'lazy'}
            fetchPriority={imagePriority ? 'high' : 'auto'}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={(e) => { e.currentTarget.src = "https://placehold.co/500x750?text=Sem+Capa"; setImageLoaded(true); }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-300 gap-2">
            <BookOpen className="h-10 w-10" />
            <span className="text-xs font-medium">Sem Capa</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
          <span className="bg-white text-slate-900 px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
            <PlayCircle className="h-4 w-4" /> {currentProgress > 0 ? 'Continuar' : 'Ler Agora'}
          </span>
        </div>

        <div className="absolute top-2 right-2">
          <span className={`
            flex items-center gap-1 text-[10px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider shadow-sm backdrop-blur-md
            ${book.file_type === 'pdf' 
              ? 'bg-red-600/90 text-white' 
              : 'bg-amber-600/90 text-white'}
          `}>
             <FileText className="h-3 w-3" /> {book.file_type}
          </span>
        </div>

        {currentProgress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
            <div 
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, currentProgress))}%` }}
              role="progressbar"
              aria-label="Progresso de leitura"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(currentProgress)}
            />
          </div>
        )}
      </div>
      
      <div className="mt-3 space-y-1 px-1">
        <h3 className="font-extrabold text-base text-slate-900 leading-tight line-clamp-2 group-hover:text-amber-700 transition-colors" title={book.title}>
          {book.title}
        </h3>
        <p className="text-sm font-medium text-slate-700 line-clamp-1">
          {book.author}
        </p>
        
        {currentProgress > 0 && (
          <div className="mt-1 space-y-0.5">
            <p className="text-[11px] font-bold text-emerald-700">
              {Math.round(currentProgress)}% concluído
              {book.file_type === 'pdf' && book.last_position ? ` • pág. ${book.last_position}` : ''}
            </p>
            {book.last_read_at && (
              <p className="text-[10px] font-medium text-slate-500">
                Última leitura {new Date(book.last_read_at).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
