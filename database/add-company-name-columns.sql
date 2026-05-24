-- Shiftly: add readable company_name columns beside company_id.
-- Keep company_id as the real relationship/security key.
-- company_name is a convenience field for Supabase table browsing/exporting.

alter table public.company_users
add column if not exists company_name text;

alter table public.admins
add column if not exists company_name text;

alter table public.supervisors
add column if not exists company_name text;

alter table public.sites
add column if not exists company_name text;

alter table public.employees
add column if not exists company_name text;

alter table public.clock_events
add column if not exists company_name text;

create table if not exists public.time_entries (
  entry_id uuid not null default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  company_name text not null,
  created_at timestamp with time zone not null default now(),
  action text not null,
  employee_id text not null,
  employee_name text not null,
  supervisor_code text not null,
  site_id text not null,
  site_name text not null,
  lat double precision not null,
  lon double precision not null,
  accuracy_m integer not null,
  distance_m integer not null,
  result text not null,
  message text not null,
  supervisor_id text null,
  supervisor_name text null,
  constraint time_entries_pkey primary key (entry_id),
  constraint time_entries_action_check check (action = any (array['IN'::text, 'OUT'::text])),
  constraint time_entries_result_check check (result = any (array['OK'::text, 'BLOCKED'::text]))
);

alter table public.time_entries
add column if not exists company_name text;

update public.company_users cu
set company_name = c.name
from public.companies c
where c.id = cu.company_id
  and (cu.company_name is null or cu.company_name <> c.name);

update public.admins a
set company_name = c.name
from public.companies c
where c.id = a.company_id
  and (a.company_name is null or a.company_name <> c.name);

update public.supervisors s
set company_name = c.name
from public.companies c
where c.id = s.company_id
  and (s.company_name is null or s.company_name <> c.name);

update public.sites s
set company_name = c.name
from public.companies c
where c.id = s.company_id
  and (s.company_name is null or s.company_name <> c.name);

update public.employees e
set company_name = c.name
from public.companies c
where c.id = e.company_id
  and (e.company_name is null or e.company_name <> c.name);

update public.clock_events ce
set company_name = c.name
from public.companies c
where c.id = ce.company_id
  and (ce.company_name is null or ce.company_name <> c.name);

update public.time_entries te
set company_name = c.name
from public.companies c
where c.id = te.company_id
  and (te.company_name is null or te.company_name <> c.name);

alter table public.company_users
alter column company_name set not null;

alter table public.admins
alter column company_name set not null;

alter table public.supervisors
alter column company_name set not null;

alter table public.sites
alter column company_name set not null;

alter table public.employees
alter column company_name set not null;

-- clock_events may be empty; this is safe if all rows have company_id linked.
alter table public.clock_events
alter column company_name set not null;

alter table public.time_entries
alter column company_name set not null;

create index if not exists company_users_company_name_idx
on public.company_users(company_name);

create index if not exists admins_company_name_idx
on public.admins(company_name);

create index if not exists supervisors_company_name_idx
on public.supervisors(company_name);

create index if not exists sites_company_name_idx
on public.sites(company_name);

create index if not exists employees_company_name_idx
on public.employees(company_name);

create index if not exists clock_events_company_name_idx
on public.clock_events(company_name);

create index if not exists time_entries_company_name_idx
on public.time_entries(company_name);

create or replace function public.set_company_name_from_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select c.name into new.company_name
  from public.companies c
  where c.id = new.company_id;

  return new;
end;
$$;

drop trigger if exists set_company_users_company_name on public.company_users;
create trigger set_company_users_company_name
before insert or update of company_id on public.company_users
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_admins_company_name on public.admins;
create trigger set_admins_company_name
before insert or update of company_id on public.admins
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_supervisors_company_name on public.supervisors;
create trigger set_supervisors_company_name
before insert or update of company_id on public.supervisors
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_sites_company_name on public.sites;
create trigger set_sites_company_name
before insert or update of company_id on public.sites
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_employees_company_name on public.employees;
create trigger set_employees_company_name
before insert or update of company_id on public.employees
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_clock_events_company_name on public.clock_events;
create trigger set_clock_events_company_name
before insert or update of company_id on public.clock_events
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_time_entries_company_name on public.time_entries;
create trigger set_time_entries_company_name
before insert or update of company_id on public.time_entries
for each row execute function public.set_company_name_from_company_id();

select 'company_users' as table_name, count(*) as rows_updated from public.company_users
union all
select 'admins', count(*) from public.admins
union all
select 'supervisors', count(*) from public.supervisors
union all
select 'sites', count(*) from public.sites
union all
select 'employees', count(*) from public.employees
union all
select 'clock_events', count(*) from public.clock_events
union all
select 'time_entries', count(*) from public.time_entries
order by table_name;
