# 📚 Costa&Costa Library - Plataforma de Leitura Digital Gratuita

Um aplicativo web progressivo (PWA) para leitura gratuita de livros em formato PDF e EPUB, inspirado no Kindle.

## ✨ Funcionalidades

- 🔐 **Autenticação**: Login e cadastro com email/senha
- 📖 **Leitura Online**: Suporte completo para PDF e EPUB
- 🌓 **Modo Escuro/Claro**: Tema ajustável para conforto de leitura
- 📊 **Progresso de Leitura**: Salva automaticamente onde você parou
- 📚 **Biblioteca Pessoal**: Acompanhe livros iniciados e seu progresso
- 🔍 **Busca e Filtros**: Encontre livros por título, autor ou categoria
- 👨‍💼 **Painel Administrativo**: Upload de novos livros (apenas admins)
- 📱 **PWA**: Instale no seu dispositivo e use offline
- 🎨 **Interface Moderna**: Design inspirado em Kindle e Apple Books

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Estilização**: Tailwind CSS + shadcn/ui
- **Backend**: OnSpace Cloud (compatível com Supabase API)
- **State Management**: Zustand + TanStack Query
- **Leitores**: react-pdf (PDF) + react-reader (EPUB)
- **Roteamento**: React Router v6

## 🚀 Como Rodar Localmente

### 1. Pré-requisitos

- Node.js 18+ instalado
- Conta no OnSpace (ou Supabase)

### 2. Clone e Instale

```bash
git clone <seu-repositorio>
cd Costa&Costa Library
npm install
```

### 3. Configure as Variáveis de Ambiente

As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` são geradas automaticamente pelo OnSpace.

### 4. Execute o Projeto

```bash
npm run dev
```

Acesse: `http://localhost:5173`

## 🗄️ Estrutura do Banco de Dados

### Tabelas Criadas

#### `books`
- `id` (uuid, PK)
- `title` (text)
- `author` (text)
- `description` (text, nullable)
- `category` (text)
- `cover_url` (text, nullable)
- `file_url` (text)
- `file_type` (pdf | epub)
- `created_at` (timestamptz)

#### `reading_progress`
- `id` (uuid, PK)
- `user_id` (uuid, FK → user_profiles)
- `book_id` (uuid, FK → books)
- `progress` (numeric, 0-100)
- `last_position` (text, nullable)
- `updated_at` (timestamptz)

#### `user_profiles` (modificada)
- Adicionada coluna: `role` (user | admin)

### Storage Bucket
- **Bucket**: `books` (público)
- Armazena arquivos PDF/EPUB e capas

## 🔐 Sistema de Permissões

### RLS (Row Level Security)

**Books (Leitura pública)**:
- Qualquer usuário pode ler livros
- Apenas admins podem inserir/atualizar/deletar

**Reading Progress (Privado)**:
- Usuários só acessam seu próprio progresso

**Storage**:
- Leitura pública
- Upload apenas para admins

## 👨‍💼 Como se Tornar Admin

Por padrão, novos usuários têm `role = 'user'`. Para tornar-se admin:

1. Acesse o painel do OnSpace Cloud
2. Vá em **Data** > **user_profiles**
3. Edite seu usuário e altere `role` para `'admin'`
4. Faça logout e login novamente

## 📱 PWA - Instalação

O app pode ser instalado como PWA em dispositivos móveis e desktop:

1. Abra o app no navegador
2. Clique em "Instalar" ou "Adicionar à tela inicial"
3. Use como aplicativo nativo!

**Funcionalidades offline**:
- Cache de páginas visitadas
- Livros já carregados ficam disponíveis

## 🎨 Personalização

### Cores e Tema
Edite `src/index.css` e `tailwind.config.ts` para customizar:
- Cores primárias
- Gradientes
- Animações
- Fontes

### Categorias de Livros
Adicione categorias em:
- `src/pages/Home.tsx` (array `CATEGORIES`)
- `src/pages/Admin.tsx` (array `CATEGORIES`)

## 📤 Deploy no OnSpace

1. Clique no botão **Publish** no canto superior direito
2. Escolha entre:
   - **Publish**: Publica em `seu-app.onspace.app`
   - **Add Existing Domain**: Use domínio customizado

## 🐛 Troubleshooting

### Erro ao carregar PDF
- Verifique se o arquivo está acessível publicamente
- Confirme que o CORS está configurado no bucket

### Progresso não salva
- Verifique se o usuário está autenticado
- Confirme que as RLS policies estão ativas

### Admin não consegue fazer upload
- Verifique se o campo `role` está como `'admin'`
- Confirme as policies do Storage

## 📝 Licença

MIT License - Sinta-se livre para usar em seus projetos!

## 🤝 Contribuindo

Contribuições são bem-vindas! Abra uma issue ou pull request.

---

**Desenvolvido com ❤️ usando OnSpace + React**
