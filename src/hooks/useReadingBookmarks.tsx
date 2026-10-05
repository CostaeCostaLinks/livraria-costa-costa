import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isDemoMode, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

export interface ReadingBookmark {
  id: string;
  user_id: string;
  book_id: string;
  position: string;
  page_number: number | null;
  label: string | null;
  created_at: string;
}

export function useReadingBookmarks(bookId?: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['reading-bookmarks', bookId],
    queryFn: async () => {
      if (!user || !bookId || isDemoMode) return [] as ReadingBookmark[];

      const { data, error } = await supabase
        .from('reading_bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ReadingBookmark[];
    },
    enabled: !!user && !!bookId,
    retry: false,
  });
}

export function useAddReadingBookmark() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      bookId,
      position,
      pageNumber,
      label,
    }: {
      bookId: string;
      position: string;
      pageNumber?: number | null;
      label?: string | null;
    }) => {
      if (!user) throw new Error('Usuário não autenticado');
      if (isDemoMode) return null;

      const { data, error } = await supabase
        .from('reading_bookmarks')
        .insert({
          user_id: user.id,
          book_id: bookId,
          position,
          page_number: pageNumber ?? null,
          label: label?.trim() || null,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as ReadingBookmark;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading-bookmarks', variables.bookId] });
    },
  });
}

export function useDeleteReadingBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string; bookId: string }) => {
      if (isDemoMode) return;
      const { error } = await supabase.from('reading_bookmarks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading-bookmarks', variables.bookId] });
    },
  });
}
