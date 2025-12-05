import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';

export function useReadingProgress(bookId?: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['reading-progress', bookId],
    queryFn: async () => {
      if (!user || !bookId) return null;
      
      if (isDemoMode) return { progress: 0, last_position: null };

      // --- CORREÇÃO DO LOOPING ---
      // Trocamos .single() por .maybeSingle()
      // .single() -> Gera erro 406 se não encontrar nada (causa o loop)
      // .maybeSingle() -> Retorna null se não encontrar nada (correto)
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .maybeSingle();

      if (error) throw error;
      
      // Se não encontrar progresso, retorna um objeto padrão zerado
      return data || { progress: 0, last_position: null };
    },
    enabled: !!user && !!bookId,
    retry: false, // Importante: Não tentar novamente se der erro, para evitar travamentos
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
      
      // Filtra casos onde o livro pode ter sido deletado mas o progresso ficou
      return data
        .filter((item: any) => item.book !== null) 
        .map((item: any) => ({
          ...item.book,
          progress: item.progress,
        }));
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
      // Atualiza o cache localmente para refletir a mudança na hora
      queryClient.invalidateQueries({ queryKey: ['reading-progress', variables.bookId] });
      queryClient.invalidateQueries({ queryKey: ['my-library'] });
    },
  });
}