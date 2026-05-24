-- Shiftly: connect a new company to the multi-company app.
-- Use this in the TEST Supabase project first.
--
-- Before running:
-- 1. Create the user in Supabase Authentication > Users.
-- 2. Copy that user's UID.
-- 3. Replace the values in the params block below.

with params as (
  select
    'NEW COMPANY NAME'::text as company_name,
    'new-company-slug'::text as company_slug,
    'AUTH_USER_UUID_HERE'::uuid as auth_user_id,
    'user@example.com'::text as auth_user_email,
    'User Name'::text as auth_user_name,
    'owner'::text as user_role,
    '999111'::text as admin_code,
    'Admin Name'::text as admin_name,
    'SUP01'::text as supervisor_id,
    '384981'::text as supervisor_code,
    'Supervisor Name'::text as supervisor_name,
    'Main Site'::text as site_name,
    -26.2041::double precision as site_lat,
    28.0473::double precision as site_lon,
    2000::integer as site_radius_m,
    'E001'::text as employee_id,
    'Test Employee'::text as employee_name
),
upsert_company as (
  insert into public.companies (name, slug)
  select company_name, company_slug
  from params
  on conflict (slug)
  do update set name = excluded.name, status = 'active'
  returning id
),
company_row as (
  select id from upsert_company
  union
  select c.id
  from public.companies c
  join params p on p.company_slug = c.slug
  limit 1
),
upsert_user as (
  insert into public.company_users (company_id, user_id, email, full_name, role, active)
  select c.id, p.auth_user_id, p.auth_user_email, p.auth_user_name, p.user_role, true
  from company_row c
  cross join params p
  on conflict (company_id, user_id)
  do update set email = excluded.email, full_name = excluded.full_name, role = excluded.role, active = true
  returning company_id
),
upsert_admin as (
  insert into public.admins (company_id, code, full_name, active)
  select c.id, p.admin_code, p.admin_name, true
  from company_row c
  cross join params p
  on conflict (company_id, code)
  do update set full_name = excluded.full_name, active = true
  returning company_id
),
upsert_supervisor as (
  insert into public.supervisors (company_id, supervisor_id, code, full_name, active)
  select c.id, p.supervisor_id, p.supervisor_code, p.supervisor_name, true
  from company_row c
  cross join params p
  on conflict (company_id, supervisor_id)
  do update set code = excluded.code, full_name = excluded.full_name, active = true
  returning supervisor_id
),
insert_site as (
  insert into public.sites (company_id, company_name, name, lat, lon, radius_m, active)
  select c.id, p.company_name, p.site_name, p.site_lat, p.site_lon, p.site_radius_m, true
  from company_row c
  cross join params p
  returning site_id
),
upsert_employee as (
  insert into public.employees (company_id, employee_id, full_name, active)
  select c.id, upper(trim(p.employee_id)), p.employee_name, true
  from company_row c
  cross join params p
  on conflict (company_id, employee_id)
  do update set full_name = excluded.full_name, active = true
  returning employee_id
)
select
  c.id as company_id,
  p.company_name,
  p.company_slug,
  p.auth_user_id,
  p.user_role,
  p.admin_code,
  us.supervisor_id,
  p.supervisor_code,
  s.site_id,
  p.site_name,
  e.employee_id
from company_row c
cross join params p
left join upsert_supervisor us on true
left join insert_site s on true
left join upsert_employee e on true;
