import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';

export function useAuth() {
  const { user, login, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const syncSessionUser = async (sessionUser: { id: string; email?: string | null } | null) => {
      if (!sessionUser) {
        logout();
        return;
      }

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('full_name, phone, role')
        .eq('id', sessionUser.id)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil da sessão:', error);
      }

      if (!active) return;

      login({
        id: sessionUser.id,
        email: sessionUser.email || '',
        name: profile?.full_name || 'Leitor',
        phone: profile?.phone,
        role: profile?.role === 'admin' ? 'admin' : 'user',
      });
    };

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        await syncSessionUser(session?.user || null);
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        logout();
      } finally {
        if (active) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        logout();
        return;
      }

      void syncSessionUser(session.user);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [login, logout]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro ao encerrar sessão:', error);
    }
    logout();
  };

  return { user, loading, logout: signOut };
}
