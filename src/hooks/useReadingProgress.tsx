import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { resolveSignedUrl, signStorageUrls } from '@/lib/storage';

export function useReadingProgress(bookId?: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['reading-progress', bookId],
    queryFn: async () => {
      if (!user || !bookId) return null;
      if (isDemoMode) return { progress: 0, last_position: null };

      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle();

      if (error) throw error;
      return data || { progress: 0, last_position: null };
    },
    enabled: !!user && !!bookId,
    retry: false,
  });
}

export function useMyLibrary() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['my-library'],
    queryFn: async () => {
      if (!user) return [];
      if (isDemoMode) return [];

      const { data, error } = await supabase
        .from('reading_progress')
        .select(`
          *,
          book:books (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const validItems = data.filter((item: any) => item.book !== null);
      const signedCovers = await signStorageUrls(validItems.map((item: any) => item.book.cover_url));

      return validItems
        .map((item: any) => ({
          ...item.book,
          cover_url: resolveSignedUrl(item.book.cover_url, signedCovers),
          progress: item.progress,
          last_position: item.last_position,
          last_read_at: item.updated_at,
        }))
        .sort((a: any, b: any) => new Date(b.last_read_at || 0).getTime() - new Date(a.last_read_at || 0).getTime());
    },
    enabled: !!user,
  });
}

export function useSaveProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({ bookId, progress, lastPosition }: { bookId: string, progress: number, lastPosition?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');
      if (isDemoMode) return;

      const { error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          book_id: bookId,
          progress,
          last_position: lastPosition,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,book_id' });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reading-progress', variables.bookId] });
      queryClient.invalidateQueries({ queryKey: ['my-library'] });
    },
  });
}
