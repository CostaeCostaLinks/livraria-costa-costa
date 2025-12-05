import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { BookOpen, User, Phone, Mail, Lock } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  
  // Novos campos no estado de cadastro
  const [signupData, setSignupData] = useState({ 
    fullName: '',
    phone: '',
    email: '', 
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;

      if (data.user) {
        // Busca o perfil completo (incluindo nome e telefone)
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

        toast.success(`Bem-vindo de volta, ${profile?.full_name?.split(' ')[0] || 'Leitor'}!`);
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Cria o usuário na autenticação
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            full_name: signupData.fullName, // Salva no metadados também por segurança
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // 2. Atualiza a tabela de perfis com Nome e Telefone
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            full_name: signupData.fullName,
            phone: signupData.phone
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Erro ao salvar perfil:', profileError);
          // Não bloqueia o fluxo, mas avisa no console
        }

        toast.success('Conta criada com sucesso!');
        
        // Login automático
        login({
          id: data.user.id,
          email: data.user.email!,
          name: signupData.fullName,
          phone: signupData.phone,
          role: 'user',
        });

        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-md animate-in fade-in zoom-in duration-300 border-primary/20 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center shadow-inner">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-serif font-bold text-primary">Costa & Costa</CardTitle>
            <CardDescription className="tracking-widest uppercase text-xs mt-1">Library</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="login-email" type="email" className="pl-9" value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="login-password" type="password" className="pl-9" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} required />
                  </div>
                </div>
                <Button type="submit" className="w-full font-bold" disabled={loading}>
                  {loading ? 'Entrando...' : 'Acessar Biblioteca'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="fullName" placeholder="Ex: João Silva" className="pl-9" value={signupData.fullName} onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="phone" placeholder="(00) 90000-0000" className="pl-9" value={signupData.phone} onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-email" type="email" className="pl-9" value={signupData.email} onChange={(e) => setSignupData({ ...signupData, email: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="signup-password" type="password" className="pl-9" value={signupData.password} onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} required minLength={6} />
                  </div>
                </div>

                <Button type="submit" className="w-full font-bold" disabled={loading}>
                  {loading ? 'Criando conta...' : 'Criar Conta Gratuita'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}