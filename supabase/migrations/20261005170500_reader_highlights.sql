-- Destaques e anotações por usuário/livro.
create table if not exists public.reading_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  format text not null check (format in ('pdf', 'epub')),
  position text not null,
  page_number integer null check (page_number is null or page_number > 0),
  selected_text text not null,
  color text not null default 'yellow' check (color in ('yellow','green','blue','pink')),
  note text null,
  anchor jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reading_highlights_user_book_idx
  on public.reading_highlights (user_id, book_id, created_at desc);

alter table public.reading_highlights enable row level security;

revoke all on table public.reading_highlights from anon;
grant select, insert, update, delete on table public.reading_highlights to authenticated;

drop policy if exists "reading_highlights_select_own" on public.reading_highlights;
create policy "reading_highlights_select_own"
on public.reading_highlights for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "reading_highlights_insert_own" on public.reading_highlights;
create policy "reading_highlights_insert_own"
on public.reading_highlights for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "reading_highlights_update_own" on public.reading_highlights;
create policy "reading_highlights_update_own"
on public.reading_highlights for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "reading_highlights_delete_own" on public.reading_highlights;
create policy "reading_highlights_delete_own"
on public.reading_highlights for delete
to authenticated
using (auth.uid() = user_id);