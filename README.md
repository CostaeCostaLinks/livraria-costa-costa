# Costa & Costa Library

Plataforma de leitura digital em React, TypeScript e Vite, com autenticação Supabase, leitura de PDF/EPUB, progresso de leitura, marcadores, destaques, anotações e painel administrativo.

## Produção

- Aplicação: https://livraria-costa-costa.vercel.app
- Frontend: React 19 + TypeScript + Vite
- Backend/Auth/Database/Storage: Supabase
- Deploy: Vercel
- Roteamento SPA: configurado em `vercel.json`

## Funcionalidades

- autenticação por email e senha;
- biblioteca pessoal com progresso de leitura;
- leitor PDF com retomada de página, marcadores, destaques e anotações;
- leitor EPUB com retomada por CFI, tema claro/escuro e ajuste de fonte;
- busca e categorias;
- Blog;
- Bio / Links;
- painel administrativo para livros e posts;
- PWA instalável;
- Storage privado com URLs assinadas.

## Segurança

O projeto utiliza:

- Row Level Security (RLS) nas tabelas da aplicação;
- perfil administrativo controlado em `user_profiles.role`;
- bucket `books` privado;
- leitura de arquivos por URLs assinadas;
- upload e exclusão de objetos do Storage restritos ao perfil administrador;
- progresso, marcadores e destaques restritos ao próprio usuário;
- função `handle_new_user()` sem execução direta por `anon` ou `authenticated`.

A proteção contra senhas vazadas do Supabase não está disponível no plano Free. Se o projeto migrar para Pro ou superior, habilite **Leaked Password Protection** em Authentication.

## Variáveis de ambiente

A aplicação exige:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

Nunca coloque `service_role`, secret keys ou credenciais administrativas no frontend.

## Desenvolvimento local

```bash
npm install
npm run dev
```

Por padrão, o Vite usa `http://localhost:5173`.

## Validação antes de produção

Execute:

```bash
npm run build
```

Depois faça smoke test de:

- login e logout;
- persistência de sessão após recarregar;
- Home e Minha Biblioteca;
- PDF e EPUB;
- Blog e Bio / Links;
- Admin com perfil administrador;
- bloqueio do Admin para usuário comum;
- upload/substituição de arquivo no Admin;
- acesso aos arquivos apenas por URL assinada.

## Service Worker / PWA

O build executa `npm run update-sw`, que altera a versão de cache em `public/sw.js`.

Durante validações locais, esse arquivo pode aparecer como modificado. Caso a alteração seja apenas a versão gerada pelo build e não deva ser commitada:

```bash
git restore public/sw.js
```

O Service Worker não intercepta chamadas para `supabase.co` nem arquivos PDF.

## Banco e Storage

Principais tabelas:

- `books`
- `posts`
- `user_profiles`
- `reading_progress`
- `reading_bookmarks`
- `reading_highlights`

Bucket:

- `books` — **privado**

As referências persistidas de arquivos/capas são caminhos relativos no bucket. O frontend gera URLs assinadas em tempo de execução.

## Deploy na Vercel

Configuração SPA:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

No projeto da Vercel, configure as variáveis:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

O comando de build é:

```bash
npm run build
```

e o diretório de saída é:

```text
dist
```

## Observações

- O aviso de `caniuse-lite` desatualizado não bloqueia o build.
- O projeto possui dependências com diferenças de peer dependency relacionadas ao React 19; não use `npm install --force` ou `--legacy-peer-deps` sem análise prévia.
- Para mudanças de banco, mantenha migrations versionadas em `supabase/migrations`.

## Licença

Consulte a política de uso/licenciamento definida pelo mantenedor do projeto.
