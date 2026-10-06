-- Storage privado - Fase 2B
-- Torna o bucket books privado e restringe leitura/upload a usuários autenticados.

do $$
declare
  bad_refs bigint;
begin
  select
    (select count(*) from public.books where file_url ~ '^https?://') +
    (select count(*) from public.books where cover_url ~ '^https?://') +
    (select count(*) from public.posts where cover_url ~ '^https?://') +
    (select count(*) from public.books b where b.file_url is not null and not exists (
       select 1 from storage.objects o where o.bucket_id='books' and o.name=b.file_url
     )) +
    (select count(*) from public.books b where b.cover_url is not null and not exists (
       select 1 from storage.objects o where o.bucket_id='books' and o.name=b.cover_url
     )) +
    (select count(*) from public.posts p where p.cover_url is not null and not exists (
       select 1 from storage.objects o where o.bucket_id='books' and o.name=p.cover_url
     ))
  into bad_refs;

  if bad_refs <> 0 then
    raise exception 'Storage private migration aborted: % invalid references remain', bad_refs;
  end if;
end
$$;

drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Admin Upload" on storage.objects;

create policy "books_authenticated_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'books');

create policy "books_admin_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'books'
  and exists (
    select 1
    from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
  )
);

update storage.buckets
set public = false
where id = 'books';
