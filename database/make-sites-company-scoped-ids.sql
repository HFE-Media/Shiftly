-- Shiftly: make site IDs company-scoped.
--
-- Goal:
--   HFE Media can have S01, S02, S03...
--   Another company can also have S01, S02, S03...
--
-- This means the real unique key is (company_id, site_id), not site_id alone.

create or replace function public.generate_company_site_id(p_company_id uuid)
returns text
language plpgsql
as $$
declare
  next_num integer;
begin
  select coalesce(max(substring(site_id from 2)::integer), 0) + 1
  into next_num
  from public.sites
  where company_id = p_company_id
    and site_id ~ '^S[0-9]+$';

  return 'S' || lpad(next_num::text, 2, '0');
end;
$$;

create or replace function public.set_site_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null then
    raise exception 'company_id is required';
  end if;

  if new.site_id is null or trim(new.site_id) = '' then
    new.site_id := public.generate_company_site_id(new.company_id);
  else
    new.site_id := upper(trim(new.site_id));
  end if;

  select c.name into new.company_name
  from public.companies c
  where c.id = new.company_id;

  return new;
end;
$$;

alter table public.sites
add column if not exists company_name text;

update public.sites s
set company_name = c.name
from public.companies c
where c.id = s.company_id
  and (s.company_name is null or s.company_name <> c.name);

alter table public.sites
alter column company_name set not null;

-- A column default cannot generate per-company IDs because it cannot see company_id.
alter table public.sites
alter column site_id drop default;

-- Drop dependent foreign keys before changing the primary key.
alter table public.clock_events
drop constraint if exists clock_events_site_id_fkey;

alter table public.clock_events
drop constraint if exists clock_events_company_id_site_id_fkey;

do $$
begin
  if to_regclass('public.time_entries') is not null then
    alter table public.time_entries
    drop constraint if exists time_entries_site_id_fkey;

    alter table public.time_entries
    drop constraint if exists time_entries_company_id_site_id_fkey;
  end if;
end $$;

alter table public.sites
drop constraint if exists sites_pkey;

drop index if exists sites_company_site_id_key;

alter table public.sites
add constraint sites_pkey primary key (company_id, site_id);

create index if not exists sites_site_id_idx
on public.sites(site_id);

create index if not exists sites_company_id_idx
on public.sites(company_id);

create index if not exists sites_company_name_idx
on public.sites(company_name);

drop trigger if exists set_sites_company_name on public.sites;
drop trigger if exists set_site_defaults on public.sites;

create trigger set_site_defaults
before insert or update of company_id, site_id
on public.sites
for each row
execute function public.set_site_defaults();

-- Recreate clock_events relationship as company-scoped.
alter table public.clock_events
add constraint clock_events_company_id_site_id_fkey
foreign key (company_id, site_id)
references public.sites(company_id, site_id);

do $$
begin
  if to_regclass('public.time_entries') is not null then
    alter table public.time_entries
    add constraint time_entries_company_id_site_id_fkey
    foreign key (company_id, site_id)
    references public.sites(company_id, site_id);
  end if;
end $$;

select
  company_id,
  company_name,
  site_id,
  name,
  active
from public.sites
order by company_name, site_id;
