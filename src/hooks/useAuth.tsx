import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const { user, login, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Busca o perfil completo com NOME e TELEFONE
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          // Só atualiza se necessário para evitar loops infinitos
          if (!user || user.id !== session.user.id || !user.name) {
            login({
              id: session.user.id,
              email: session.user.email!,
              // Pega o nome do perfil ou usa 'Leitor' como fallback se estiver vazio
              name: profile?.full_name || 'Leitor',
              phone: profile?.phone,
              role: profile?.role || 'user',
            });
          }
        } else if (user) {
          // Se não tem sessão mas tem usuário na memória, faz logout
          logout();
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
    
    // Ouve mudanças na autenticação (login/logout em outras abas)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        logout();
      }
    });

    return () => subscription.unsubscribe();
  }, [login, logout]); 

  // Função auxiliar para realizar o logout completo (Supabase + Estado Local)
  const signOut = async () => {
    await supabase.auth.signOut();
    logout();
  };

  // Retorna também a função de logout (agora chamada signOut para diferenciar da interna)
  return { user, loading, logout: signOut };
}