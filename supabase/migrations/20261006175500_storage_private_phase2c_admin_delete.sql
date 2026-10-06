-- Storage privado - Fase 2C
-- Permite que administradores removam objetos substituídos/excluídos via Storage API.

drop policy if exists "books_admin_delete" on storage.objects;

create policy "books_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'books'
  and exists (
    select 1
    from public.user_profiles
    where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
  )
);
