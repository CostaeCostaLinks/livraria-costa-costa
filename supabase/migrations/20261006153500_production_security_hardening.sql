-- Production security hardening for Costa & Costa Library
-- 1) Prevent privilege escalation through user_profiles.role
-- 2) Remove anonymous table access not used by the authenticated app
-- 3) Tighten RLS roles to authenticated
-- 4) Lock SECURITY DEFINER search_path

-- user_profiles: remove overly broad policies.
drop policy if exists "Perfis são públicos para leitura" on public.user_profiles;
drop policy if exists "Usuários editam próprios perfis" on public.user_profiles;

create policy "user_profiles_select_own"
on public.user_profiles
for select
to authenticated
using (auth.uid() = id);

create policy "user_profiles_update_own"
on public.user_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Least-privilege grants. Users may edit only profile fields, never id/role/created_at.
revoke all privileges on table public.user_profiles from anon;
revoke all privileges on table public.user_profiles from authenticated;
grant select on table public.user_profiles to authenticated;
grant update (full_name, phone) on table public.user_profiles to authenticated;

-- Books: authenticated users can read; RLS limits writes to admins.
drop policy if exists "Qualquer um pode ver livros" on public.books;
drop policy if exists "Apenas admins podem adicionar livros" on public.books;

create policy "books_select_authenticated"
on public.books
for select
to authenticated
using (true);

create policy "books_insert_admin"
on public.books
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
  )
);

revoke all privileges on table public.books from anon;
revoke all privileges on table public.books from authenticated;
grant select, insert, update, delete on table public.books to authenticated;

-- Posts: authenticated users can read; RLS limits writes to admins.
drop policy if exists "Todos leem posts" on public.posts;
drop policy if exists "Admin gerencia posts" on public.posts;

create policy "posts_select_authenticated"
on public.posts
for select
to authenticated
using (true);

create policy "posts_admin_all"
on public.posts
for all
to authenticated
using (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
  )
);

revoke all privileges on table public.posts from anon;
revoke all privileges on table public.posts from authenticated;
grant select, insert, update, delete on table public.posts to authenticated;

-- Reading progress is strictly per authenticated user.
drop policy if exists "Usuário atualiza seu próprio progresso" on public.reading_progress;
drop policy if exists "Usuário vê seu próprio progresso" on public.reading_progress;

create policy "reading_progress_select_own"
on public.reading_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "reading_progress_insert_own"
on public.reading_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "reading_progress_update_own"
on public.reading_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reading_progress_delete_own"
on public.reading_progress
for delete
to authenticated
using (auth.uid() = user_id);

revoke all privileges on table public.reading_progress from anon;
revoke all privileges on table public.reading_progress from authenticated;
grant select, insert, update, delete on table public.reading_progress to authenticated;

-- Existing bookmark/highlight RLS is already user-scoped; reduce grants.
revoke all privileges on table public.reading_bookmarks from anon;
revoke all privileges on table public.reading_bookmarks from authenticated;
grant select, insert, update, delete on table public.reading_bookmarks to authenticated;

revoke all privileges on table public.reading_highlights from anon;
revoke all privileges on table public.reading_highlights from authenticated;
grant select, insert, update, delete on table public.reading_highlights to authenticated;

-- Harden the auth trigger's SECURITY DEFINER execution context.
alter function public.handle_new_user() set search_path = '';
