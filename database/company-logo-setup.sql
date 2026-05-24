alter table public.companies
add column if not exists logo_url text null;

insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do update set public = true;

drop policy if exists "company logo public read" on storage.objects;
create policy "company logo public read"
on storage.objects for select
to public
using (bucket_id = 'company-logos');

drop policy if exists "company admins can upload logos" on storage.objects;
create policy "company admins can upload logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'company-logos'
  and exists (
    select 1
    from public.company_users cu
    where cu.company_id::text = (storage.foldername(name))[1]
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

drop policy if exists "company admins can update logos" on storage.objects;
create policy "company admins can update logos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'company-logos'
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
  bucket_id = 'company-logos'
  and exists (
    select 1
    from public.company_users cu
    where cu.company_id::text = (storage.foldername(name))[1]
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

drop policy if exists "company admins can update company logo url" on public.companies;
create policy "company admins can update company logo url"
on public.companies for update
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = companies.id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = companies.id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);
