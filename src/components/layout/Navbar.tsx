import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Library, LogOut, Moon, Sun, Upload, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const darkMode = localStorage.getItem('theme') === 'dark';
    setIsDark(darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao sair');
      return;
    }
    logout();
    navigate('/auth');
    toast.success('Logout realizado com sucesso');
  };

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Costa&Costa Library</span>
          </Link>

          <div className="flex items-center space-x-2">
            <Button
              variant={isActive('/') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/')}
            >
              <Home className="h-4 w-4 mr-2" />
              Início
            </Button>

            <Button
              variant={isActive('/library') ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/library')}
            >
              <Library className="h-4 w-4 mr-2" />
              Minha Biblioteca
            </Button>

            {user.role === 'admin' && (
              <Button
                variant={isActive('/admin') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <Upload className="h-4 w-4 mr-2" />
                Admin
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
