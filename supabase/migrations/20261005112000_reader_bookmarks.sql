-- Marcadores de leitura por usuário e livro.
create table if not exists public.reading_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  position text not null,
  page_number integer null check (page_number is null or page_number > 0),
  label text null,
  created_at timestamptz not null default now()
);

create index if not exists reading_bookmarks_user_book_idx
  on public.reading_bookmarks (user_id, book_id, created_at desc);

alter table public.reading_bookmarks enable row level security;

revoke all on table public.reading_bookmarks from anon;
grant select, insert, update, delete on table public.reading_bookmarks to authenticated;

drop policy if exists "reading_bookmarks_select_own" on public.reading_bookmarks;
create policy "reading_bookmarks_select_own"
on public.reading_bookmarks for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "reading_bookmarks_insert_own" on public.reading_bookmarks;
create policy "reading_bookmarks_insert_own"
on public.reading_bookmarks for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "reading_bookmarks_update_own" on public.reading_bookmarks;
create policy "reading_bookmarks_update_own"
on public.reading_bookmarks for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "reading_bookmarks_delete_own" on public.reading_bookmarks;
create policy "reading_bookmarks_delete_own"
on public.reading_bookmarks for delete
to authenticated
using (auth.uid() = user_id);
