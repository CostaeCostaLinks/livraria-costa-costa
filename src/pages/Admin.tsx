import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Upload, Loader2, Pencil, Trash2, Save, X, Book, FileText, Image as ImageIcon, 
  Bold, Italic, Heading1, Heading2, Type, Palette 
} from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';

const CATEGORIES = [
  'Ficção', 'Romance', 'Fantasia', 'Suspense', 'Clássicos', 'Biografia', 
  'História', 'Ciência', 'Auto Ajuda', 'Negócios', 'Cura Interior', 
  'Espiritualidade', 'Neurociência', 'Filosofia', 'Tecnologia', 
  'Arte', 'Saúde', 'HQs', 'Infantil', 'Poesia', 'Educação'
];

export default function Admin() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState({ title: '', author: '', description: '', category: '', order_index: 0 });
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postForm, setPostForm] = useState({ title: '', subtitle: '', content: '' });
  const [postCover, setPostCover] = useState<File | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      const timer = setTimeout(() => { if (!user || user.role !== 'admin') navigate('/'); }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  const { data: books } = useQuery({
    queryKey: ['admin-books'],
    queryFn: async () => (await supabase.from('books').select('*').order('order_index', { ascending: true })).data,
    enabled: !!user && user.role === 'admin'
  });

  const { data: posts } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => (await supabase.from('posts').select('*').order('created_at', { ascending: false })).data,
    enabled: !!user && user.role === 'admin'
  });

  if (!user || user.role !== 'admin') return null;

  const applyFormat = (tag: string, value?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = postForm.content;
    const selectedText = text.substring(start, end);

    if (!selectedText) {
      toast.warning('Selecione o texto que deseja formatar primeiro.');
      return;
    }

    const beforeText = text.substring(0, start);
    const afterText = text.substring(end);

    let formattedText = '';

    switch (tag) {
      case 'bold': formattedText = `<b>${selectedText}</b>`; break;
      case 'italic': formattedText = `<i>${selectedText}</i>`; break;
      case 'h2': formattedText = `<h2>${selectedText}</h2>`; break;
      case 'h3': formattedText = `<h3>${selectedText}</h3>`; break;
      case 'small': formattedText = `<small>${selectedText}</small>`; break;
      case 'color': 
        formattedText = `<span style="color: ${value}">${selectedText}</span>`; 
        break;
      case 'size': 
        formattedText = `<span style="font-size: ${value}">${selectedText}</span>`; 
        break;
    }

    const newContent = beforeText + formattedText + afterText;
    setPostForm({ ...postForm, content: newContent });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
    }, 0);
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookId && !bookFile) return toast.error('Selecione o arquivo do livro.');
    
    // VALIDAÇÕES ADICIONADAS AQUI
    if (bookFile && !bookFile.name.match(/\.(pdf|epub)$/i)) {
      return toast.error("O arquivo do livro deve ser PDF ou EPUB.");
    }
    if (coverFile && !coverFile.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return toast.error("A capa deve ser uma imagem (JPG, PNG, WEBP).");
    }

    setLoading(true);
    try {
      let bookUrl = null, coverUrl = null;
      let fileType = 'pdf'; // padrão

      if (bookFile) {
        // Detecta extensão
        if (bookFile.name.toLowerCase().endsWith('.epub')) fileType = 'epub';
        
        const name = `livro-${Date.now()}.${bookFile.name.split('.').pop()}`;
        await supabase.storage.from('books').upload(name, bookFile);
        bookUrl = supabase.storage.from('books').getPublicUrl(name).data.publicUrl;
      }

      if (coverFile) {
        const name = `covers/capa-${Date.now()}.${coverFile.name.split('.').pop()}`;
        await supabase.storage.from('books').upload(name, coverFile);
        coverUrl = supabase.storage.from('books').getPublicUrl(name).data.publicUrl;
      }

      const payload: any = { ...bookForm };
      if (bookUrl) { 
        payload.file_url = bookUrl; 
        payload.file_type = fileType; // Salva o tipo correto no banco
      }
      if (coverUrl) payload.cover_url = coverUrl;

      if (editingBookId) await supabase.from('books').update(payload).eq('id', editingBookId);
      else { if (!bookUrl) throw new Error("Arquivo necessário"); await supabase.from('books').insert({ ...payload, file_type: fileType }); }

      toast.success('Livro salvo com sucesso!');
      setEditingBookId(null); setBookForm({ title: '', author: '', description: '', category: '', order_index: 0 });
      setBookFile(null); setCoverFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
    } catch (error) { toast.error('Erro ao salvar livro'); } finally { setLoading(false); }
  };

  const deleteBook = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este livro?')) {
      await supabase.from('books').delete().eq('id', id);
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // VALIDAÇÃO DE CAPA DO POST
    if (postCover && !postCover.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return toast.error("A capa deve ser uma imagem (JPG, PNG, WEBP).");
    }

    setLoading(true);
    try {
      let coverUrl = null;
      if (postCover) {
        const name = `blog/post-${Date.now()}.${postCover.name.split('.').pop()}`;
        await supabase.storage.from('books').upload(name, postCover);
        coverUrl = supabase.storage.from('books').getPublicUrl(name).data.publicUrl;
      }
      const payload: any = { ...postForm };
      if (coverUrl) payload.cover_url = coverUrl;
      if (editingPostId) await supabase.from('posts').update(payload).eq('id', editingPostId);
      else await supabase.from('posts').insert(payload);
      toast.success('Post publicado com sucesso!');
      setEditingPostId(null); setPostForm({ title: '', subtitle: '', content: '' }); setPostCover(null);
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    } catch (error) { toast.error('Erro ao salvar post'); } finally { setLoading(false); }
  };

  const deletePost = async (id: string) => {
    if (confirm('Excluir este artigo?')) { await supabase.from('posts').delete().eq('id', id); queryClient.invalidateQueries({ queryKey: ['admin-posts'] }); }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl pb-24">
      <h1 className="text-3xl font-serif font-bold text-primary mb-6">Painel Administrativo</h1>
      <Tabs defaultValue="books" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
          <TabsTrigger value="books" className="flex gap-2"><Book className="h-4 w-4"/> Livros</TabsTrigger>
          <TabsTrigger value="posts" className="flex gap-2"><FileText className="h-4 w-4"/> Blog</TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <Card>
            <CardHeader><CardTitle>{editingBookId ? 'Editar Livro' : 'Novo Livro'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleBookSubmit} className="space-y-4">
                <Input placeholder="Título" value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} required />
                <Input placeholder="Autor" value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <Select value={bookForm.category} onValueChange={v => setBookForm({...bookForm, category: v})}>
                    <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent position="popper" side="right" className="max-h-[200px]">{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="number" placeholder="Ordem" value={bookForm.order_index} onChange={e => setBookForm({...bookForm, order_index: parseInt(e.target.value) || 0})} />
                </div>
                <Textarea placeholder="Descrição" value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})} rows={3} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label>Capa (Imagem)</Label>
                        <Input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Arquivo (PDF/EPUB)</Label>
                        <Input type="file" accept=".pdf,.epub" onChange={e => setBookFile(e.target.files?.[0] || null)} required={!editingBookId} />
                    </div>
                </div>

                <div className="flex gap-2 pt-4"><Button type="submit" className="flex-1" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Salvar'}</Button>{editingBookId && <Button type="button" variant="outline" onClick={() => setEditingBookId(null)}><X className="h-4 w-4"/></Button>}</div>
              </form>
            </CardContent>
          </Card>
          <div className="bg-muted/30 rounded-xl border border-border p-2 max-h-[600px] overflow-y-auto space-y-2">
             {books?.map((book: any) => (
               <div key={book.id} className="flex justify-between items-center p-3 bg-card border rounded-lg">
                 <div className="min-w-0"><p className="font-bold text-sm truncate">{book.title}</p></div>
                 <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditingBookId(book.id); setBookForm(book); }}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" className="text-red-500" onClick={() => deleteBook(book.id)}><Trash2 className="h-4 w-4"/></Button></div>
               </div>
             ))}
          </div>
        </TabsContent>

        <TabsContent value="posts" className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <Card>
            <CardHeader><CardTitle>{editingPostId ? 'Editar Artigo' : 'Novo Artigo'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handlePostSubmit} className="space-y-4">
                <Input placeholder="Título do Artigo" value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})} required />
                <Input placeholder="Subtítulo (Opcional)" value={postForm.subtitle} onChange={e => setPostForm({...postForm, subtitle: e.target.value})} />
                
                <div className="space-y-2">
                  <Label>Conteúdo (Selecione o texto para formatar)</Label>
                  
                  {/* BARRA DE FERRAMENTAS */}
                  <div className="flex flex-wrap gap-1 p-1 bg-muted rounded-md border border-border w-full mb-1">
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => applyFormat('bold')} title="Negrito">
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => applyFormat('italic')} title="Itálico">
                      <Italic className="h-4 w-4" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-1 self-center" />
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs font-bold" onClick={() => applyFormat('h2')} title="Título Grande">H1</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs font-bold" onClick={() => applyFormat('h3')} title="Título Médio">H2</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => applyFormat('small')} title="Texto Pequeno">
                      <Type className="h-3 w-3" />
                    </Button>
                    <div className="w-px h-6 bg-border mx-1 self-center" />
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-yellow-600" onClick={() => applyFormat('color', '#CA8A04')} title="Texto Dourado">
                      <Palette className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-600" onClick={() => applyFormat('color', '#059669')} title="Texto Verde">
                      <Palette className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600" onClick={() => applyFormat('color', '#DC2626')} title="Texto Vermelho">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Textarea 
                    ref={textareaRef}
                    placeholder="Escreva seu artigo..." 
                    className="min-h-[400px] font-serif text-lg leading-relaxed p-4 border-2 focus-visible:ring-primary" 
                    value={postForm.content} 
                    onChange={e => setPostForm({...postForm, content: e.target.value})} 
                    required 
                  />
                </div>

                <div className="space-y-1"><Label>Capa (Opcional)</Label><Input type="file" accept="image/*" onChange={e => setPostCover(e.target.files?.[0] || null)} /></div>
                <div className="flex gap-2 pt-4"><Button type="submit" className="flex-1" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : 'Publicar'}</Button>{editingPostId && <Button type="button" variant="outline" onClick={() => setEditingPostId(null)}><X className="h-4 w-4"/></Button>}</div>
              </form>
            </CardContent>
          </Card>
          
          <div className="bg-muted/30 rounded-xl border border-border p-2 max-h-[600px] overflow-y-auto space-y-2">
             {posts?.map((post: any) => (
               <div key={post.id} className="p-3 bg-card border rounded-lg hover:border-primary/50 transition-colors">
                 <h4 className="font-bold text-sm line-clamp-1">{post.title}</h4>
                 <div className="flex justify-between items-center mt-2 pt-2 border-t"><span className="text-[10px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</span><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditingPostId(post.id); setPostForm(post); }}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" className="text-red-500" onClick={() => deletePost(post.id)}><Trash2 className="h-4 w-4"/></Button></div></div>
               </div>
             ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}