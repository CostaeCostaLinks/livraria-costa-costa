import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { supabase } from '@/lib/supabase';
import { getStorageObjectPath } from '@/lib/storage';
import { optimizeImageFile } from '@/lib/imageOptimization';
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
  const [optimizingCovers, setOptimizingCovers] = useState(false);
  const [coverOptimizationProgress, setCoverOptimizationProgress] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookForm, setBookForm] = useState({ title: '', author: '', description: '', category: '', order_index: 0 });
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postForm, setPostForm] = useState({ title: '', subtitle: '', content: '', video_url: '' });
  const [postCover, setPostCover] = useState<File | null>(null);

  const removeStorageObjects = async (values: Array<string | null | undefined>) => {
    const paths = Array.from(
      new Set(
        values
          .map((value) => getStorageObjectPath(value))
          .filter((path): path is string => Boolean(path))
      )
    );

    if (paths.length === 0) return;

    const { error } = await supabase.storage.from('books').remove(paths);
    if (error) throw error;
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      const timer = setTimeout(() => { if (!user || user.role !== 'admin') navigate('/'); }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  const { data: books, isError: booksError, refetch: refetchBooks } = useQuery({
    queryKey: ['admin-books'],
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('*').order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && user.role === 'admin'
  });

  const { data: posts, isError: postsError, refetch: refetchPosts } = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
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
    
    if (bookFile && !bookFile.name.match(/\.(pdf|epub)$/i)) {
      return toast.error("O arquivo do livro deve ser PDF ou EPUB.");
    }
    if (coverFile && !coverFile.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return toast.error("A capa deve ser uma imagem (JPG, PNG, WEBP).");
    }

    setLoading(true);
    try {
      const existingBook = editingBookId
        ? books?.find((book: any) => book.id === editingBookId)
        : null;

      let bookUrl = null, coverUrl = null;
      let fileType = 'pdf';

      if (bookFile) {
        if (bookFile.name.toLowerCase().endsWith('.epub')) fileType = 'epub';
        const name = `livro-${Date.now()}.${bookFile.name.split('.').pop()}`;
        const { error: bookUploadError } = await supabase.storage.from('books').upload(name, bookFile);
        if (bookUploadError) throw bookUploadError;
        bookUrl = name;
      }

      if (coverFile) {
        const optimizedCover = await optimizeImageFile(coverFile, {
          maxWidth: 900,
          maxHeight: 1350,
          quality: 0.8,
          filename: coverFile.name,
        });
        const name = `covers/capa-${Date.now()}.webp`;
        const { error: coverUploadError } = await supabase.storage.from('books').upload(name, optimizedCover, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        });
        if (coverUploadError) throw coverUploadError;
        coverUrl = name;
      }

      const payload: any = { ...bookForm };
      if (bookUrl) { 
        payload.file_url = bookUrl; 
        payload.file_type = fileType; 
      }
      if (coverUrl) payload.cover_url = coverUrl;

      if (editingBookId) {
        const { error } = await supabase.from('books').update(payload).eq('id', editingBookId);
        if (error) throw error;

        const staleObjects = [
          bookUrl && existingBook?.file_url && existingBook.file_url !== bookUrl ? existingBook.file_url : null,
          coverUrl && existingBook?.cover_url && existingBook.cover_url !== coverUrl ? existingBook.cover_url : null,
        ];

        try {
          await removeStorageObjects(staleObjects);
        } catch (cleanupError) {
          console.error('Erro ao remover objetos antigos do livro:', cleanupError);
          toast.warning('Livro atualizado, mas um arquivo antigo não pôde ser removido.');
        }
      } else {
        if (!bookUrl) throw new Error("Arquivo necessário");
        const { error } = await supabase.from('books').insert({ ...payload, file_type: fileType });
        if (error) throw error;
      }

      toast.success('Livro salvo com sucesso!');
      setEditingBookId(null); setBookForm({ title: '', author: '', description: '', category: '', order_index: 0 });
      setBookFile(null); setCoverFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
    } catch (error) {
      console.error('Erro ao salvar livro:', error);
      toast.error('Não foi possível salvar o livro. Tente novamente.');
    } finally { setLoading(false); }
  };

  const deleteBook = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este livro?')) return;

    const existingBook = books?.find((book: any) => book.id === id);
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir livro:', error);
      toast.error('Não foi possível excluir o livro.');
      return;
    }

    try {
      await removeStorageObjects([existingBook?.file_url, existingBook?.cover_url]);
    } catch (cleanupError) {
      console.error('Erro ao remover arquivos do livro excluído:', cleanupError);
      toast.warning('Livro excluído, mas um arquivo antigo não pôde ser removido.');
    }

    toast.success('Livro excluído.');
    queryClient.invalidateQueries({ queryKey: ['admin-books'] });
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (postCover && !postCover.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      return toast.error("A capa deve ser uma imagem (JPG, PNG, WEBP).");
    }

    setLoading(true);
    try {
      const existingPost = editingPostId
        ? posts?.find((post: any) => post.id === editingPostId)
        : null;

      let coverUrl = null;
      if (postCover) {
        const optimizedCover = await optimizeImageFile(postCover, {
          maxWidth: 1200,
          maxHeight: 800,
          quality: 0.8,
          filename: postCover.name,
        });
        const name = `blog/post-${Date.now()}.webp`;
        const { error: postCoverUploadError } = await supabase.storage.from('books').upload(name, optimizedCover, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        });
        if (postCoverUploadError) throw postCoverUploadError;
        coverUrl = name;
      }
      const payload: any = { ...postForm };
      if (coverUrl) payload.cover_url = coverUrl;
      
      if (editingPostId) {
        const { error } = await supabase.from('posts').update(payload).eq('id', editingPostId);
        if (error) throw error;

        if (coverUrl && existingPost?.cover_url && existingPost.cover_url !== coverUrl) {
          try {
            await removeStorageObjects([existingPost.cover_url]);
          } catch (cleanupError) {
            console.error('Erro ao remover capa antiga do post:', cleanupError);
            toast.warning('Post atualizado, mas a capa antiga não pôde ser removida.');
          }
        }
      } else {
        const { error } = await supabase.from('posts').insert(payload);
        if (error) throw error;
      }
      
      toast.success('Post publicado com sucesso!');
      setEditingPostId(null); setPostForm({ title: '', subtitle: '', content: '', video_url: '' }); setPostCover(null);
      queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    } catch (error) {
      console.error('Erro ao salvar post:', error);
      toast.error('Não foi possível salvar o post. Tente novamente.');
    } finally { setLoading(false); }
  };


  const optimizeExistingBookCovers = async () => {
    if (!books?.length) return;
    if (!confirm('Otimizar as capas existentes para carregarem mais rápido no celular?')) return;

    setOptimizingCovers(true);
    let optimized = 0;
    let skipped = 0;

    try {
      for (let index = 0; index < books.length; index += 1) {
        const book = books[index] as any;
        const path = getStorageObjectPath(book.cover_url);
        setCoverOptimizationProgress(`${index + 1}/${books.length}`);

        if (!path) {
          skipped += 1;
          continue;
        }

        const { data: blob, error: downloadError } = await supabase.storage.from('books').download(path);
        if (downloadError) throw downloadError;

        if (blob.size <= 450_000 && path.toLowerCase().endsWith('.webp')) {
          skipped += 1;
          continue;
        }

        const optimizedFile = await optimizeImageFile(blob, {
          maxWidth: 900,
          maxHeight: 1350,
          quality: 0.78,
          filename: `capa-${book.id}.webp`,
        });

        const newPath = `covers/optimized-${book.id}-${Date.now()}.webp`;
        const { error: uploadError } = await supabase.storage.from('books').upload(newPath, optimizedFile, {
          contentType: 'image/webp',
          cacheControl: '31536000',
        });
        if (uploadError) throw uploadError;

        const { error: updateError } = await supabase
          .from('books')
          .update({ cover_url: newPath })
          .eq('id', book.id);

        if (updateError) {
          await supabase.storage.from('books').remove([newPath]);
          throw updateError;
        }

        try {
          await supabase.storage.from('books').remove([path]);
        } catch (cleanupError) {
          console.error('Erro ao remover capa antiga:', cleanupError);
        }

        optimized += 1;
      }

      queryClient.invalidateQueries({ queryKey: ['admin-books'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['my-library'] });
      toast.success(`Capas otimizadas: ${optimized}. Mantidas sem alteração: ${skipped}.`);
    } catch (error) {
      console.error('Erro ao otimizar capas:', error);
      toast.error('A otimização foi interrompida. As capas já concluídas foram preservadas.');
    } finally {
      setOptimizingCovers(false);
      setCoverOptimizationProgress('');
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Excluir este artigo?')) return;

    const existingPost = posts?.find((post: any) => post.id === id);
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) {
      console.error('Erro ao excluir post:', error);
      toast.error('Não foi possível excluir o post.');
      return;
    }

    try {
      await removeStorageObjects([existingPost?.cover_url]);
    } catch (cleanupError) {
      console.error('Erro ao remover capa do post excluído:', cleanupError);
      toast.warning('Post excluído, mas a capa antiga não pôde ser removida.');
    }

    toast.success('Post excluído.');
    queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-serif font-bold text-primary">Painel Administrativo</h1>
        <Button
          type="button"
          variant="outline"
          onClick={optimizeExistingBookCovers}
          disabled={optimizingCovers || loading}
        >
          {optimizingCovers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
          {optimizingCovers ? `Otimizando ${coverOptimizationProgress}` : 'Otimizar capas'}
        </Button>
      </div>
      {(booksError || postsError) && (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-semibold text-destructive">Parte dos dados administrativos não pôde ser carregada.</p>
          <p className="mt-1 text-muted-foreground">Verifique sua conexão e tente novamente.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {booksError && <Button type="button" variant="outline" size="sm" onClick={() => refetchBooks()}>Recarregar livros</Button>}
            {postsError && <Button type="button" variant="outline" size="sm" onClick={() => refetchPosts()}>Recarregar posts</Button>}
          </div>
        </div>
      )}
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
                
                <Input placeholder="Link do Vídeo no YouTube (Opcional)" value={postForm.video_url || ''} onChange={e => setPostForm({...postForm, video_url: e.target.value})} />
                
                <div className="space-y-2">
                  <Label>Conteúdo (Selecione o texto para formatar)</Label>
                  
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