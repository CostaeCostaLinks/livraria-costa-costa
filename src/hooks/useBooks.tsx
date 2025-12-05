import { useQuery } from '@tanstack/react-query';
import { supabase, isDemoMode } from '@/lib/supabase';

export function useBooks(category?: string) {
  return useQuery({
    queryKey: ['books', category],
    queryFn: async () => {
      if (isDemoMode) return [];

      let query = supabase
        .from('books')
        .select('*')
        // AQUI ESTÁ A MÁGICA: Ordena pelo campo 'order_index' (0, 1, 2...)
        // Se dois livros tiverem o mesmo número, o Supabase desempata por padrão (geralmente ID)
        .order('order_index', { ascending: true }); 
      
      if (category && category !== 'Todos') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

export function useBook(id: string) {
  return useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      if (isDemoMode) return null;

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}