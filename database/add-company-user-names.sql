-- Shiftly: add a company-specific user display name.
-- Run this in the TEST Supabase project.

alter table public.company_users
add column if not exists full_name text;

alter table public.company_users
add column if not exists email text;

update public.company_users cu
set full_name = coalesce(
  nullif(cu.full_name, ''),
  nullif(au.raw_user_meta_data->>'full_name', ''),
  nullif(au.raw_user_meta_data->>'name', ''),
  'User'
)
from auth.users au
where au.id = cu.user_id
  and (cu.full_name is null or cu.full_name = '');

update public.company_users cu
set email = coalesce(nullif(cu.email, ''), au.email)
from auth.users au
where au.id = cu.user_id
  and (cu.email is null or cu.email = '');

alter table public.company_users
alter column full_name set not null;

alter table public.company_users
alter column email set not null;

create index if not exists company_users_email_idx
on public.company_users(email);

-- Optional: set/override HFE Media user's display name.
update public.company_users
set
  full_name = 'Francois Engelbrecht',
  email = 'hfe.m3dia@gmail.com'
where company_id = '7721bc3a-272c-4e4d-97e9-d9d6107bf42a'
  and user_id = 'b04daf36-6fb9-4bbe-b4b8-b432d7078cde';

select
  cu.company_id,
  c.name as company_name,
  cu.user_id,
  cu.email,
  cu.full_name,
  cu.role,
  cu.active
from public.company_users cu
join public.companies c on c.id = cu.company_id
order by c.name, cu.full_name;
