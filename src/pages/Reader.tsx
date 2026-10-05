import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, List, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PDFReader } from '@/components/features/PDFReader';
import { EPUBReader } from '@/components/features/EPUBReader';
import { useBook } from '@/hooks/useBooks';
import { useReadingProgress, useSaveProgress } from '@/hooks/useReadingProgress';
import {
  useAddReadingBookmark,
  useDeleteReadingBookmark,
  useReadingBookmarks,
} from '@/hooks/useReadingBookmarks';
import { useToast } from '@/hooks/use-toast';

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export default function ReaderPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: book, isLoading: bookLoading } = useBook(id);
  const { data: savedProgress, isLoading: progressLoading } = useReadingProgress(id);
  const { data: bookmarks = [] } = useReadingBookmarks(id);
  const { mutate: saveProgress } = useSaveProgress();
  const addBookmark = useAddReadingBookmark();
  const deleteBookmark = useDeleteReadingBookmark();

  const [currentPosition, setCurrentPosition] = useState<string>('1');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [readerJump, setReaderJump] = useState<string | number | null>(null);

  const pendingSave = useRef<{ progress: number; lastPosition: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<{ progress: number; lastPosition: string } | null>(null);

  const initialPdfPage = useMemo(() => {
    const parsed = Number.parseInt(savedProgress?.last_position || '1', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [savedProgress?.last_position]);

  const initialEpubLocation = savedProgress?.last_position || undefined;
  const isEpub = !!book && (book.file_type === 'epub' || book.file_type?.includes('epub'));

  useEffect(() => {
    if (!savedProgress) return;
    setCurrentProgress(clampProgress(Number(savedProgress.progress || 0)));
    if (savedProgress.last_position) {
      setCurrentPosition(savedProgress.last_position);
      const page = Number.parseInt(savedProgress.last_position, 10);
      if (Number.isFinite(page) && page > 0) setCurrentPage(page);
    }
  }, [savedProgress]);

  const persistPending = useCallback(() => {
    if (!id || !pendingSave.current) return;
    const next = pendingSave.current;
    const previous = lastSaved.current;

    if (
      previous &&
      previous.lastPosition === next.lastPosition &&
      Math.abs(previous.progress - next.progress) < 0.05
    ) {
      return;
    }

    lastSaved.current = next;
    saveProgress({
      bookId: id,
      progress: clampProgress(next.progress),
      lastPosition: next.lastPosition,
    });
  }, [id, saveProgress]);

  const queueProgressSave = useCallback(
    (progress: number, lastPosition: string) => {
      const normalized = { progress: clampProgress(progress), lastPosition };
      pendingSave.current = normalized;
      setCurrentProgress(normalized.progress);
      setCurrentPosition(lastPosition);

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(persistPending, 900);
    },
    [persistPending]
  );

  useEffect(() => {
    const flush = () => persistPending();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      persistPending();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [persistPending]);

  const handlePdfPageChange = useCallback(
    (page: number, total: number) => {
      setCurrentPage(page);
      setTotalPages(total);
      queueProgressSave((page / Math.max(total, 1)) * 100, String(page));
    },
    [queueProgressSave]
  );

  const handleEpubLocationChange = useCallback(
    (location: string, progress?: number) => {
      queueProgressSave(progress ?? currentProgress, location);
    },
    [currentProgress, queueProgressSave]
  );

  const handleAddBookmark = async () => {
    if (!id || !currentPosition) return;
    try {
      await addBookmark.mutateAsync({
        bookId: id,
        position: currentPosition,
        pageNumber: isEpub ? null : currentPage,
      });
      toast({
        title: 'Marcador salvo',
        description: isEpub ? 'Trecho marcado para voltar depois.' : `Página ${currentPage} marcada.`,
      });
    } catch {
      toast({ title: 'Não foi possível salvar o marcador', variant: 'destructive' });
    }
  };

  const handleJumpToBookmark = (position: string) => {
    if (isEpub) {
      setReaderJump(position);
      return;
    }
    const page = Number.parseInt(position, 10);
    if (Number.isFinite(page) && page > 0) setReaderJump(page);
  };

  if (bookLoading || progressLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <span className="ml-3 font-medium text-muted-foreground">Abrindo livro...</span>
      </div>
    );
  }

  if (!book || !book.file_url) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-xl font-semibold text-foreground">Livro não encontrado</p>
        <p className="text-muted-foreground">O arquivo solicitado não existe ou foi removido.</p>
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Biblioteca
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <header className="flex items-center gap-2 border-b border-border px-2 py-2 bg-background/95 backdrop-blur z-40 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="font-semibold text-sm sm:text-base line-clamp-1">{book.title}</h1>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="line-clamp-1">{book.author}</span>
            <span aria-hidden>•</span>
            <span>{Math.round(currentProgress)}%</span>
            {!isEpub && totalPages ? <span>• pág. {currentPage}/{totalPages}</span> : null}
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={handleAddBookmark} aria-label="Adicionar marcador">
          <Bookmark className="h-5 w-5" />
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir marcadores">
              <List className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[88vw] sm:max-w-sm">
            <SheetHeader>
              <SheetTitle>Meus marcadores</SheetTitle>
              <SheetDescription>Volte rapidamente aos pontos que você marcou neste livro.</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              {bookmarks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Você ainda não adicionou marcadores neste livro.</p>
              ) : (
                bookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="rounded-xl border p-3 flex items-center gap-2">
                    <button
                      className="min-w-0 flex-1 text-left"
                      onClick={() => handleJumpToBookmark(bookmark.position)}
                    >
                      <p className="font-medium text-sm truncate">
                        {bookmark.label || (bookmark.page_number ? `Página ${bookmark.page_number}` : 'Trecho marcado')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(bookmark.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteBookmark.mutate({ id: bookmark.id, bookId: id })}
                      aria-label="Excluir marcador"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="min-h-0 flex-1">
        {isEpub ? (
          <EPUBReader
            url={book.file_url}
            initialLocation={initialEpubLocation}
            locationOverride={typeof readerJump === 'string' ? readerJump : undefined}
            onLocationChange={handleEpubLocationChange}
          />
        ) : (
          <PDFReader
            url={book.file_url}
            initialPage={initialPdfPage}
            targetPage={typeof readerJump === 'number' ? readerJump : undefined}
            onPageChange={handlePdfPageChange}
          />
        )}
      </main>
    </div>
  );
}
