import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { BookOpen, User, Phone, Mail, Lock, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Auth() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  
  // Estado para alternar entre Login e Cadastro (sem usar Tabs do shadcn para ter mais liberdade visual)
  const [isSignUp, setIsSignUp] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // --- LÓGICA DE CADASTRO ---
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { full_name: formData.fullName } },
        });

        if (error) throw error;

        if (data.user) {
          // Atualiza perfil com telefone
          const { error: profileError } = await supabase
            .from('user_profiles')
            .update({ full_name: formData.fullName, phone: formData.phone })
            .eq('id', data.user.id);

          if (profileError) console.error('Erro perfil:', profileError);

          toast.success('Conta criada com sucesso!');
          login({
            id: data.user.id,
            email: data.user.email!,
            name: formData.fullName,
            phone: formData.phone,
            role: 'user',
          });
          navigate('/');
        }
      } else {
        // --- LÓGICA DE LOGIN ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        if (data.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          login({
            id: data.user.id,
            email: data.user.email!,
            name: profile?.full_name || 'Leitor',
            phone: profile?.phone,
            role: profile?.role || 'user',
          });

          toast.success(`Bem-vindo, ${profile?.full_name?.split(' ')[0] || 'Leitor'}!`);
          navigate('/');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-yellow-500 selection:text-slate-900">
      
      {/* --- EFEITOS VISUAIS (Aurora Background - Igual Costa Links) --- */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/10 rounded-full mix-blend-screen filter blur-[128px] opacity-40 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-screen filter blur-[128px] opacity-30 animate-pulse"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white font-medium transition-colors z-20 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar para Home
      </Link>

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
        
        {/* LOGO */}
        <div className="flex flex-col items-center justify-center mb-8 transform hover:scale-105 transition-transform duration-500">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl p-3 shadow-lg shadow-yellow-500/20 mb-4">
             <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-serif font-bold text-3xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-600 drop-shadow-sm">
            Costa & Costa
          </h1>
          <span className="text-[10px] font-medium tracking-[0.3em] text-slate-500 uppercase mt-1">Library Edition</span>
        </div>

        {/* CARD GLASSMORPHISM */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden group">
          
          {/* Brilho no topo do card */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent opacity-50"></div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-serif font-bold text-white mb-2 flex items-center justify-center gap-2">
              {isSignUp ? 'Crie sua conta' : 'Acesse sua Biblioteca'}
              {isSignUp && <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />}
            </h2>
            <p className="text-slate-400 text-sm">
              {isSignUp ? 'Junte-se à comunidade de leitores.' : 'Continue sua leitura de onde parou.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* CAMPOS EXTRAS DE CADASTRO */}
            {isSignUp && (
              <>
                <div className="space-y-2">
                    <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Input 
                            name="fullName"
                            placeholder="Nome Completo" 
                            className="pl-9 bg-slate-950/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-yellow-500 focus:ring-yellow-500/20 h-11" 
                            value={formData.fullName} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Input 
                            name="phone"
                            placeholder="WhatsApp (com DDD)" 
                            className="pl-9 bg-slate-950/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-yellow-500 focus:ring-yellow-500/20 h-11" 
                            value={formData.phone} 
                            onChange={handleChange} 
                            required 
                        />
                    </div>
                </div>
              </>
            )}

            {/* CAMPOS PADRÃO (LOGIN/EMAIL) */}
            <div className="space-y-2">
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input 
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="E-mail" 
                        className="pl-9 bg-slate-950/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-yellow-500 focus:ring-yellow-500/20 h-11" 
                        value={formData.email} 
                        onChange={handleChange} 
                        required 
                    />
                </div>
            </div>

            <div className="space-y-2">
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input 
                        name="password"
                        type="password"
                        autoComplete={isSignUp ? "new-password" : "current-password"}
                        placeholder="Senha" 
                        className="pl-9 bg-slate-950/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-yellow-500 focus:ring-yellow-500/20 h-11" 
                        value={formData.password} 
                        onChange={handleChange} 
                        required 
                        minLength={6}
                    />
                </div>
            </div>

            <Button 
                type="submit" 
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold h-12 rounded-xl text-base shadow-lg shadow-yellow-500/20 transition-all hover:scale-[1.02] active:scale-95" 
                disabled={loading}
            >
              {loading ? 'Processando...' : (isSignUp ? 'Criar Conta Gratuita' : 'Entrar na Biblioteca')}
            </Button>
          </form>

          {/* TOGGLE LOGIN/CADASTRO */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-slate-400 mb-2">
              {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
            </p>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-bold text-white hover:text-yellow-500 transition-colors inline-flex items-center gap-1 group/link text-sm"
            >
              {isSignUp ? 'Fazer Login' : 'Criar agora'} 
              <ArrowRight className="w-3 h-3 group-hover/link:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}