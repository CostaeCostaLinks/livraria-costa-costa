import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isDemoMode, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface ReadingHighlight {
  id: string;
  user_id: string;
  book_id: string;
  format: 'pdf' | 'epub';
  position: string;
  page_number: number | null;
  selected_text: string;
  color: HighlightColor;
  note: string | null;
  anchor: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateReadingHighlightInput {
  bookId: string;
  format: 'pdf' | 'epub';
  position: string;
  pageNumber?: number | null;
  selectedText: string;
  color: HighlightColor;
  note?: string | null;
  anchor?: Record<string, unknown>;
}

export function useReadingHighlights(bookId?: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['reading-highlights', bookId],
    queryFn: async () => {
      if (!user || !bookId || isDemoMode) return [] as ReadingHighlight[];

      const { data, error } = await supabase
        .from('reading_highlights')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ReadingHighlight[];
    },
    enabled: !!user && !!bookId,
    retry: false,
  });
}

export function useAddReadingHighlight() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (input: CreateReadingHighlightInput) => {
      if (!user) throw new Error('Usuário não autenticado');
      if (isDemoMode) return null;

      const { data, error } = await supabase
        .from('reading_highlights')
        .insert({
          user_id: user.id,
          book_id: input.bookId,
          format: input.format,
          position: input.position,
          page_number: input.pageNumber ?? null,
          selected_text: input.selectedText,
          color: input.color,
          note: input.note?.trim() || null,
          anchor: input.anchor || {},
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as ReadingHighlight;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading-highlights', variables.bookId] });
    },
  });
}

export function useUpdateReadingHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      bookId,
      color,
      note,
    }: {
      id: string;
      bookId: string;
      color: HighlightColor;
      note?: string | null;
    }) => {
      if (isDemoMode) return null;

      const { data, error } = await supabase
        .from('reading_highlights')
        .update({
          color,
          note: note?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data as ReadingHighlight;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading-highlights', variables.bookId] });
    },
  });
}

export function useDeleteReadingHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; bookId: string }) => {
      if (isDemoMode) return;
      const { error } = await supabase.from('reading_highlights').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading-highlights', variables.bookId] });
    },
  });
}
