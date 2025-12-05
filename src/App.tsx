import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/hooks/useAuth';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import Auth from '@/pages/Auth';
import Home from '@/pages/Home';
import Library from '@/pages/Library';
import Reader from '@/pages/Reader';
import Admin from '@/pages/Admin';
import Blog from '@/pages/Blog';
import PostView from '@/pages/PostView';
import LinksPage from '@/pages/Links';
import { DonationModal } from '@/components/features/DonationModal';
import { InstallBanner } from '@/components/features/InstallBanner';
import { 
  Library as LibraryIcon, 
  Home as HomeIcon, 
  Upload, 
  Download, 
  Sun, 
  Moon,
  User,
  BookOpenCheck,
  FileText,
  LogOut,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const { user, loading, logout } = useAuth();
  const { isInstallable, installApp } = usePWAInstall();
  const { theme, toggle } = useTheme();
  const location = useLocation();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  const isReading = location.pathname.startsWith('/read/');
  const firstName = user.name ? user.name.split(' ')[0] : 'Leitor';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-20 md:pb-0">
      
      {/* NAVBAR DESKTOP */}
      {!isReading && (
        <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              
              <Link to="/" className="flex items-center gap-3 group">
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg p-1.5 shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40 transition-all duration-300 transform group-hover:scale-105">
                  <BookOpenCheck className="h-6 w-6 text-white" />
                </div>
                <div className="flex flex-col -space-y-1">
                  <span className="font-serif font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-400 drop-shadow-sm">
                    Costa & Costa
                  </span>
                  <span className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground uppercase ml-0.5 group-hover:text-primary transition-colors">
                    Library
                  </span>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-full border border-border/50">
                <Button 
                  variant={location.pathname === '/' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  asChild
                  className={location.pathname === '/' ? 'text-primary font-semibold bg-white dark:bg-gray-800 shadow-sm' : 'text-muted-foreground hover:text-primary'}
                >
                  <Link to="/">Explorar</Link>
                </Button>
                <Button 
                  variant={location.pathname === '/library' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  asChild
                  className={location.pathname === '/library' ? 'text-primary font-semibold bg-white dark:bg-gray-800 shadow-sm' : 'text-muted-foreground hover:text-primary'}
                >
                  <Link to="/library">Biblioteca</Link>
                </Button>
                <Button 
                  variant={location.pathname.startsWith('/blog') ? 'secondary' : 'ghost'} 
                  size="sm" 
                  asChild
                  className={location.pathname.startsWith('/blog') ? 'text-primary font-semibold bg-white dark:bg-gray-800 shadow-sm' : 'text-muted-foreground hover:text-primary'}
                >
                  <Link to="/blog">Blog</Link>
                </Button>
                
                {/* NOVO: Botão Bio/Links Desktop */}
                <Button 
                  variant={location.pathname === '/links' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  asChild
                  className={location.pathname === '/links' ? 'text-primary font-semibold bg-white dark:bg-gray-800 shadow-sm' : 'text-muted-foreground hover:text-primary'}
                >
                  <Link to="/links">Bio / Links</Link>
                </Button>

                {user.role === 'admin' && (
                  <Button 
                    variant={location.pathname === '/admin' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    asChild
                    className={location.pathname === '/admin' ? 'text-primary font-semibold bg-white dark:bg-gray-800 shadow-sm' : 'text-muted-foreground hover:text-primary'}
                  >
                    <Link to="/admin">Admin</Link>
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <DonationModal />

                {isInstallable && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="hidden md:flex border-primary/30 text-primary hover:bg-primary/5 font-medium transition-colors"
                    onClick={installApp}
                  >
                    <Download className="h-4 w-4 mr-2" /> App
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggle()}
                  className="rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                
                <div className="hidden md:flex items-center gap-3 pl-3 border-l border-border">
                   <div className="text-right hidden lg:block mr-2">
                      <p className="text-sm font-bold text-foreground leading-none">Olá, {firstName}</p>
                   </div>
                   <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-yellow-500 flex items-center justify-center text-white font-bold text-sm shadow-sm border-2 border-white dark:border-gray-800">
                      {firstName.charAt(0).toUpperCase()}
                   </div>
                   
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={logout} 
                      className="ml-1 text-muted-foreground hover:text-red-500"
                      title="Sair"
                   >
                      <LogOut className="h-5 w-5" />
                   </Button>
                </div>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* ÁREA DE CONTEÚDO */}
      <main>
        {!isReading && <InstallBanner />}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<PostView />} />
          <Route path="/read/:id" element={<Reader />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/links" element={<LinksPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* BARRA INFERIOR MOBILE */}
      {!isReading && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border pb-safe-area z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-around items-center h-16">
            <Link 
              to="/" 
              className={`flex flex-col items-center w-full space-y-1 ${location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <HomeIcon className={`h-5 w-5 ${location.pathname === '/' ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-medium">Início</span>
            </Link>

            <Link 
              to="/library" 
              className={`flex flex-col items-center w-full space-y-1 ${location.pathname === '/library' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <LibraryIcon className={`h-5 w-5 ${location.pathname === '/library' ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-medium">Livros</span>
            </Link>

            <Link 
              to="/blog" 
              className={`flex flex-col items-center w-full space-y-1 ${location.pathname.startsWith('/blog') ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <FileText className={`h-5 w-5 ${location.pathname.startsWith('/blog') ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-medium">Blog</span>
            </Link>

            {/* NOVO: Botão Bio Mobile */}
            <Link 
              to="/links" 
              className={`flex flex-col items-center w-full space-y-1 ${location.pathname === '/links' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <LinkIcon className={`h-5 w-5 ${location.pathname === '/links' ? 'fill-current' : ''}`} />
              <span className="text-[10px] font-medium">Bio</span>
            </Link>

            {user.role === 'admin' && (
              <Link 
                to="/admin" 
                className={`flex flex-col items-center w-full space-y-1 ${location.pathname === '/admin' ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <Upload className={`h-5 w-5 ${location.pathname === '/admin' ? 'fill-current' : ''}`} />
                <span className="text-[10px] font-medium">Admin</span>
              </Link>
            )}

            <button 
              onClick={logout} 
              className="flex flex-col items-center w-full space-y-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <div className="h-6 w-6 rounded-full bg-muted overflow-hidden flex items-center justify-center border border-transparent hover:border-destructive">
                 <User className="h-3 w-3" />
              </div>
              <span className="text-[10px] font-medium">Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AppContent />
          <Toaster position="top-center" />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}