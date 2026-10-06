-- Storage privado - Fase 2A
-- Converte referências legadas de URLs públicas completas em caminhos relativos.
-- O bucket permanece público nesta fase para permitir validação sem indisponibilidade.

do $$
declare
  missing_count bigint;
begin
  with refs as (
    select file_url as url from public.books where file_url is not null
    union all
    select cover_url from public.books where cover_url is not null
    union all
    select cover_url from public.posts where cover_url is not null
  ),
  normalized as (
    select
      case
        when url like '%/storage/v1/object/public/books/%'
          then split_part(url, '/storage/v1/object/public/books/', 2)
        when url like '%/storage/v1/object/sign/books/%'
          then split_part(split_part(url, '/storage/v1/object/sign/books/', 2), '?', 1)
        when url ~ '^https?://'
          then null
        else ltrim(split_part(url, '?', 1), '/')
      end as object_path
    from refs
  )
  select count(*)
  into missing_count
  from normalized n
  where n.object_path is null
     or not exists (
       select 1
       from storage.objects o
       where o.bucket_id = 'books'
         and o.name = n.object_path
     );

  if missing_count <> 0 then
    raise exception 'Storage migration aborted: % referenced objects are unsupported or missing', missing_count;
  end if;
end
$$;

update public.books
set file_url = split_part(file_url, '/storage/v1/object/public/books/', 2)
where file_url like '%/storage/v1/object/public/books/%';

update public.books
set cover_url = split_part(cover_url, '/storage/v1/object/public/books/', 2)
where cover_url like '%/storage/v1/object/public/books/%';

update public.posts
set cover_url = split_part(cover_url, '/storage/v1/object/public/books/', 2)
where cover_url like '%/storage/v1/object/public/books/%';

-- Compatibilidade defensiva para eventuais signed URLs persistidas por engano.
update public.books
set file_url = split_part(split_part(file_url, '/storage/v1/object/sign/books/', 2), '?', 1)
where file_url like '%/storage/v1/object/sign/books/%';

update public.books
set cover_url = split_part(split_part(cover_url, '/storage/v1/object/sign/books/', 2), '?', 1)
where cover_url like '%/storage/v1/object/sign/books/%';

update public.posts
set cover_url = split_part(split_part(cover_url, '/storage/v1/object/sign/books/', 2), '?', 1)
where cover_url like '%/storage/v1/object/sign/books/%';
