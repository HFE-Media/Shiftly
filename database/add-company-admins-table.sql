-- Shiftly: company-scoped admin/add-site codes.
-- Run this in the TEST Supabase project.
--
-- Admins can reveal Admin mode and add sites.
-- Supervisors remain separate in public.supervisors and can only clock.

alter table public.admins
add column if not exists company_id uuid references public.companies(id) on delete cascade;

create sequence if not exists public.admins_admin_id_seq;

alter table public.admins
add column if not exists admin_id bigint;

update public.admins
set admin_id = nextval('public.admins_admin_id_seq')
where admin_id is null;

alter sequence public.admins_admin_id_seq
owned by public.admins.admin_id;

alter table public.admins
alter column admin_id set default nextval('public.admins_admin_id_seq');

alter table public.admins
alter column admin_id set not null;

alter table public.admins
add column if not exists full_name text;

alter table public.admins
add column if not exists active boolean not null default true;

-- If this project previously had role-based admins, remove role once data is normalized.
alter table public.admins
drop column if exists role;

-- Fill required names for existing rows before setting NOT NULL.
update public.admins
set full_name = coalesce(nullif(full_name, ''), 'Admin')
where full_name is null or full_name = '';

alter table public.admins
alter column full_name set not null;

-- Replace old global unique code constraint with company-scoped uniqueness.
alter table public.admins
drop constraint if exists admins_code_key;

alter table public.admins
drop constraint if exists admins_pkey;

alter table public.admins
add constraint admins_pkey primary key (admin_id);

drop index if exists admins_code_idx;

create unique index if not exists admins_company_code_key
on public.admins(company_id, code);

create index if not exists admins_company_code_idx
on public.admins(company_id, code);

create index if not exists admins_code_idx
on public.admins(code);

alter table public.admins enable row level security;

drop policy if exists "members can validate company admin codes" on public.admins;
create policy "members can validate company admin codes"
on public.admins for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = admins.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

-- HFE Media admin/add-site code.
insert into public.admins (company_id, code, full_name, active)
values ('7721bc3a-272c-4e4d-97e9-d9d6107bf42a', '999111', 'Francois Engelbrecht', true)
on conflict (company_id, code)
do update set full_name = excluded.full_name, active = true;

select admin_id, company_id, code, full_name, active
from public.admins
where company_id = '7721bc3a-272c-4e4d-97e9-d9d6107bf42a'
order by admin_id;
