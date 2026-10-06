-- Production final hardening
-- Security: revoke direct execution of auth trigger function.
-- Performance: optimize RLS auth.uid() evaluation and add FK indexes.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

alter policy "user_profiles_select_own"
on public.user_profiles
using ((select auth.uid()) = id);

alter policy "user_profiles_update_own"
on public.user_profiles
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

alter policy "Permitir delete para admins"
on public.books
using (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = (select auth.uid())
      and user_profiles.role = 'admin'
  )
);

alter policy "Permitir update para admins"
on public.books
using (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = (select auth.uid())
      and user_profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = (select auth.uid())
      and user_profiles.role = 'admin'
  )
);

alter policy "books_insert_admin"
on public.books
with check (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = (select auth.uid())
      and user_profiles.role = 'admin'
  )
);

drop policy if exists "posts_admin_all" on public.posts;

create policy "posts_insert_admin"
on public.posts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = (select auth.uid())
      and user_profiles.role = 'admin'
  )
);

create policy "posts_update_admin"
on public.posts
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = (select auth.uid())
      and user_profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = (select auth.uid())
      and user_profiles.role = 'admin'
  )
);

create policy "posts_delete_admin"
on public.posts
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_profiles
    where user_profiles.id = (select auth.uid())
      and user_profiles.role = 'admin'
  )
);

alter policy "reading_progress_select_own"
on public.reading_progress
using ((select auth.uid()) = user_id);

alter policy "reading_progress_insert_own"
on public.reading_progress
with check ((select auth.uid()) = user_id);

alter policy "reading_progress_update_own"
on public.reading_progress
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy "reading_progress_delete_own"
on public.reading_progress
using ((select auth.uid()) = user_id);

alter policy "reading_bookmarks_select_own"
on public.reading_bookmarks
using ((select auth.uid()) = user_id);

alter policy "reading_bookmarks_insert_own"
on public.reading_bookmarks
with check ((select auth.uid()) = user_id);

alter policy "reading_bookmarks_update_own"
on public.reading_bookmarks
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy "reading_bookmarks_delete_own"
on public.reading_bookmarks
using ((select auth.uid()) = user_id);

alter policy "reading_highlights_select_own"
on public.reading_highlights
using ((select auth.uid()) = user_id);

alter policy "reading_highlights_insert_own"
on public.reading_highlights
with check ((select auth.uid()) = user_id);

alter policy "reading_highlights_update_own"
on public.reading_highlights
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy "reading_highlights_delete_own"
on public.reading_highlights
using ((select auth.uid()) = user_id);

create index if not exists idx_reading_progress_book_id
  on public.reading_progress(book_id);

create index if not exists idx_reading_bookmarks_book_id
  on public.reading_bookmarks(book_id);

create index if not exists idx_reading_highlights_book_id
  on public.reading_highlights(book_id);
