import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, Highlighter, List, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { PDFTextSelection } from '@/components/features/PDFReader';
import type { EPUBTextSelection } from '@/components/features/EPUBReader';
import { useBook } from '@/hooks/useBooks';
import { useReadingProgress, useSaveProgress } from '@/hooks/useReadingProgress';
import {
  useAddReadingBookmark,
  useDeleteReadingBookmark,
  useReadingBookmarks,
} from '@/hooks/useReadingBookmarks';
import {
  type HighlightColor,
  type ReadingHighlight,
  useAddReadingHighlight,
  useDeleteReadingHighlight,
  useReadingHighlights,
  useUpdateReadingHighlight,
} from '@/hooks/useReadingHighlights';
import { useToast } from '@/hooks/use-toast';

const PDFReader = lazy(() =>
  import('@/components/features/PDFReader').then((module) => ({ default: module.PDFReader }))
);

const EPUBReader = lazy(() =>
  import('@/components/features/EPUBReader').then((module) => ({ default: module.EPUBReader }))
);


function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

const highlightOptions: Array<{ value: HighlightColor; label: string; color: string }> = [
  { value: 'yellow', label: 'Amarelo', color: '#fde047' },
  { value: 'green', label: 'Verde', color: '#86efac' },
  { value: 'blue', label: 'Azul', color: '#93c5fd' },
  { value: 'pink', label: 'Rosa', color: '#f9a8d4' },
];

export default function ReaderPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: book, isLoading: bookLoading } = useBook(id);
  const { data: savedProgress, isLoading: progressLoading } = useReadingProgress(id);
  const { data: bookmarks = [] } = useReadingBookmarks(id);
  const { data: highlights = [] } = useReadingHighlights(id);
  const { mutate: saveProgress } = useSaveProgress();
  const addBookmark = useAddReadingBookmark();
  const deleteBookmark = useDeleteReadingBookmark();
  const addHighlight = useAddReadingHighlight();
  const updateHighlight = useUpdateReadingHighlight();
  const deleteHighlight = useDeleteReadingHighlight();

  const [currentPosition, setCurrentPosition] = useState<string>('1');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [readerJump, setReaderJump] = useState<string | number | null>(null);

  const [selection, setSelection] = useState<
    | ({ format: 'pdf' } & PDFTextSelection)
    | ({ format: 'epub' } & EPUBTextSelection)
    | null
  >(null);
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('yellow');
  const [highlightNote, setHighlightNote] = useState('');
  const [editingHighlight, setEditingHighlight] = useState<ReadingHighlight | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editColor, setEditColor] = useState<HighlightColor>('yellow');
  const [editNote, setEditNote] = useState('');

  const pendingSave = useRef<{ progress: number; lastPosition: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<{ progress: number; lastPosition: string } | null>(null);

  const initialPdfPage = useMemo(() => {
    const parsed = Number.parseInt(savedProgress?.last_position || '1', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [savedProgress?.last_position]);

  const initialEpubLocation = savedProgress?.last_position || undefined;
  const isEpub = !!book && (book.file_type === 'epub' || book.file_type?.includes('epub'));
  const currentBookmark = useMemo(
    () => bookmarks.find((bookmark) => bookmark.position === currentPosition) || null,
    [bookmarks, currentPosition]
  );

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

  const handleBookmarkAction = async () => {
    if (!id || !currentPosition) return;

    if (currentBookmark) {
      try {
        await deleteBookmark.mutateAsync({ id: currentBookmark.id, bookId: id });
        toast({
          title: 'Marcador removido',
          description: isEpub ? 'O marcador deste trecho foi removido.' : `O marcador da página ${currentPage} foi removido.`,
        });
      } catch {
        toast({ title: 'Não foi possível remover o marcador', variant: 'destructive' });
      }
      return;
    }

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

  const openHighlightDialog = (
    nextSelection:
      | ({ format: 'pdf' } & PDFTextSelection)
      | ({ format: 'epub' } & EPUBTextSelection)
  ) => {
    setSelection(nextSelection);
    setHighlightColor('yellow');
    setHighlightNote('');
    setHighlightDialogOpen(true);
  };

  const handlePdfTextSelection = (nextSelection: PDFTextSelection) => {
    openHighlightDialog({ format: 'pdf', ...nextSelection });
  };

  const handleEpubTextSelection = (nextSelection: EPUBTextSelection) => {
    openHighlightDialog({ format: 'epub', ...nextSelection });
  };

  const handleSaveHighlight = async () => {
    if (!selection || !id) return;

    try {
      await addHighlight.mutateAsync({
        bookId: id,
        format: selection.format,
        position: selection.position,
        pageNumber: selection.format === 'pdf' ? selection.pageNumber : null,
        selectedText: selection.selectedText,
        color: highlightColor,
        note: highlightNote,
        anchor: selection.format === 'pdf' ? selection.anchor : { cfi: selection.position },
      });

      setHighlightDialogOpen(false);
      setSelection(null);
      setHighlightNote('');
      toast({
        title: 'Destaque salvo',
        description:
          selection.format === 'pdf'
            ? `Trecho destacado na página ${selection.pageNumber}.`
            : 'Trecho destacado no EPUB.',
      });
    } catch {
      toast({ title: 'Não foi possível salvar o destaque', variant: 'destructive' });
    }
  };

  const handleJumpToHighlight = (pageNumber: number | null, position: string) => {
    if (isEpub) {
      setReaderJump(position);
      return;
    }
    if (pageNumber) setReaderJump(pageNumber);
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!id) return;
    try {
      await deleteHighlight.mutateAsync({ id: highlightId, bookId: id });
      toast({ title: 'Destaque excluído' });
    } catch {
      toast({ title: 'Não foi possível excluir o destaque', variant: 'destructive' });
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!id) return;
    try {
      await deleteBookmark.mutateAsync({ id: bookmarkId, bookId: id });
      toast({ title: 'Marcador excluído' });
    } catch {
      toast({ title: 'Não foi possível excluir o marcador', variant: 'destructive' });
    }
  };

  const handleEditHighlight = (highlight: ReadingHighlight) => {
    setEditingHighlight(highlight);
    setEditColor(highlight.color);
    setEditNote(highlight.note || '');
    setEditDialogOpen(true);
  };

  const handleUpdateHighlight = async () => {
    if (!editingHighlight || !id) return;

    try {
      await updateHighlight.mutateAsync({
        id: editingHighlight.id,
        bookId: id,
        color: editColor,
        note: editNote,
      });

      setEditDialogOpen(false);
      setEditingHighlight(null);
      setEditNote('');
      toast({
        title: 'Destaque atualizado',
        description: 'A cor e a anotação foram salvas.',
      });
    } catch {
      toast({ title: 'Não foi possível atualizar o destaque', variant: 'destructive' });
    }
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

        <Button
          variant={currentBookmark ? 'secondary' : 'ghost'}
          size="icon"
          onClick={handleBookmarkAction}
          disabled={addBookmark.isPending || deleteBookmark.isPending}
          aria-label={currentBookmark ? 'Remover marcador atual' : 'Adicionar marcador'}
          title={currentBookmark ? 'Remover marcador atual' : 'Adicionar marcador'}
        >
          {addBookmark.isPending || deleteBookmark.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Bookmark className={`h-5 w-5 ${currentBookmark ? 'fill-current' : ''}`} />
          )}
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir destaques e anotações">
              <Highlighter className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[92vw] sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Destaques e anotações</SheetTitle>
              <SheetDescription>Selecione um trecho do texto para destacar e, se quiser, adicionar uma anotação.</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(100dvh-140px)] pr-1">
              {highlights.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <Highlighter className="h-8 w-8 mx-auto mb-3 text-muted-foreground/60" />
                  <p className="text-sm font-medium">Nenhum destaque ainda</p>
                  <p className="mt-1 text-xs text-muted-foreground">Selecione um trecho do livro para criar seu primeiro destaque.</p>
                </div>
              ) : (
                highlights.map((highlight) => (
                  <div key={highlight.id} className="rounded-xl border p-3 space-y-2">
                    <button
                      className="w-full text-left"
                      onClick={() => handleJumpToHighlight(highlight.page_number, highlight.position)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="h-3 w-3 rounded-sm border"
                          style={{ background: highlightOptions.find((option) => option.value === highlight.color)?.color }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {highlight.page_number ? `Página ${highlight.page_number}` : 'Trecho destacado'}
                        </span>
                      </div>
                      <p className="text-sm font-medium line-clamp-4">“{highlight.selected_text}”</p>
                      {highlight.note && (
                        <p className="mt-2 text-sm text-muted-foreground border-l-2 pl-2">{highlight.note}</p>
                      )}
                    </button>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(highlight.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditHighlight(highlight)}
                          aria-label="Editar destaque"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteHighlight(highlight.id)}
                          disabled={deleteHighlight.isPending}
                          aria-label="Excluir destaque"
                          title="Excluir destaque"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>

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
            <div className="mt-6 space-y-3 overflow-y-auto max-h-[calc(100dvh-140px)] pr-1">
              {bookmarks.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center">
                  <Bookmark className="h-8 w-8 mx-auto mb-3 text-muted-foreground/60" />
                  <p className="text-sm font-medium">Nenhum marcador ainda</p>
                  <p className="mt-1 text-xs text-muted-foreground">Use o ícone de marcador no topo para guardar sua posição atual.</p>
                </div>
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
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      disabled={deleteBookmark.isPending}
                      aria-label="Excluir marcador"
                      title="Excluir marcador"
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
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center bg-background">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-sm text-muted-foreground">Preparando leitor...</span>
            </div>
          }
        >
          {isEpub ? (
            <EPUBReader
              url={book.file_url}
              initialLocation={initialEpubLocation}
              locationOverride={typeof readerJump === 'string' ? readerJump : undefined}
              onLocationChange={handleEpubLocationChange}
              highlights={highlights}
              onTextSelection={handleEpubTextSelection}
            />
          ) : (
            <PDFReader
              url={book.file_url}
              initialPage={initialPdfPage}
              targetPage={typeof readerJump === 'number' ? readerJump : undefined}
              onPageChange={handlePdfPageChange}
              highlights={highlights}
              onTextSelection={handlePdfTextSelection}
            />
          )}
        </Suspense>
      </main>

      <Dialog open={highlightDialogOpen} onOpenChange={setHighlightDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Destacar trecho</DialogTitle>
            <DialogDescription>
              Escolha a cor e adicione uma anotação opcional.
            </DialogDescription>
          </DialogHeader>

          {selection && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {selection.format === 'pdf' ? `Página ${selection.pageNumber}` : 'EPUB'}
                </p>
                <p className="text-sm leading-relaxed">“{selection.selectedText}”</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Cor</p>
                <div className="flex gap-2">
                  {highlightOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setHighlightColor(option.value)}
                      className={`h-9 w-9 rounded-full border-2 transition-transform ${
                        highlightColor === option.value ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ background: option.color }}
                      aria-label={option.label}
                      title={option.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="highlight-note" className="text-sm font-medium">Anotação opcional</label>
                <Textarea
                  id="highlight-note"
                  value={highlightNote}
                  onChange={(event) => setHighlightNote(event.target.value)}
                  placeholder="Ex.: usar esta ideia no próximo treinamento..."
                  className="mt-2"
                  maxLength={2000}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setHighlightDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveHighlight} disabled={!selection || addHighlight.isPending}>
              {addHighlight.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar destaque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar destaque</DialogTitle>
            <DialogDescription>
              Altere a cor do marca-texto ou atualize sua anotação.
            </DialogDescription>
          </DialogHeader>

          {editingHighlight && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {editingHighlight.page_number ? `Página ${editingHighlight.page_number}` : 'Trecho destacado'}
                </p>
                <p className="text-sm leading-relaxed">“{editingHighlight.selected_text}”</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Cor</p>
                <div className="flex gap-2">
                  {highlightOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEditColor(option.value)}
                      className={`h-9 w-9 rounded-full border-2 transition-transform ${
                        editColor === option.value ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ background: option.color }}
                      aria-label={option.label}
                      title={option.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="edit-highlight-note" className="text-sm font-medium">Anotação</label>
                <Textarea
                  id="edit-highlight-note"
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  placeholder="Adicione ou atualize sua anotação..."
                  className="mt-2"
                  maxLength={2000}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateHighlight} disabled={!editingHighlight || updateHighlight.isPending}>
              {updateHighlight.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}