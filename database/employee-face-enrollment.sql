alter table public.employees
add column if not exists face_photo_path text null,
add column if not exists face_photo_url text null,
add column if not exists face_enrolled_at timestamp with time zone null,
add column if not exists face_descriptor jsonb null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-faces',
  'employee-faces',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company members can read employee face photos" on storage.objects;
create policy "company members can read employee face photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'employee-faces'
  and exists (
    select 1
    from public.company_users cu
    where cu.company_id::text = (storage.foldername(name))[1]
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "company admins can upload employee face photos" on storage.objects;
create policy "company admins can upload employee face photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'employee-faces'
  and exists (
    select 1
    from public.company_users cu
    where cu.company_id::text = (storage.foldername(name))[1]
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

drop policy if exists "company admins can update employee face photos" on storage.objects;
create policy "company admins can update employee face photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'employee-faces'
  and exists (
    select 1
    from public.company_users cu
    where cu.company_id::text = (storage.foldername(name))[1]
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  bucket_id = 'employee-faces'
  and exists (
    select 1
    from public.company_users cu
    where cu.company_id::text = (storage.foldername(name))[1]
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

drop policy if exists "company admins can delete employee face photos" on storage.objects;
create policy "company admins can delete employee face photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'employee-faces'
  and exists (
    select 1
    from public.company_users cu
    where cu.company_id::text = (storage.foldername(name))[1]
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);
