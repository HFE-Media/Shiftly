-- Shiftly: align sites with the original schema, company-scoped.
-- Original:
--   site_id text default generate_site_id()
--   name text
--   lat/lon/radius_m/active
--
-- Multi-company version adds:
--   company_id
--   company_name

create sequence if not exists public.site_id_seq;

select setval(
  'public.site_id_seq',
  greatest(
    coalesce((
      select max(substring(site_id from 2)::integer)
      from public.sites
      where site_id ~ '^S[0-9]+$'
    ), 0),
    0
  ),
  true
);

create or replace function public.generate_site_id()
returns text
language sql
as $$
  select 'S' || lpad(nextval('public.site_id_seq')::text, 2, '0');
$$;

alter table public.sites
add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.sites
add column if not exists company_name text;

alter table public.sites
add column if not exists active boolean not null default true;

-- If these foreign keys exist, temporarily remove them before changing site_id type.
alter table public.clock_events
drop constraint if exists clock_events_site_id_fkey;

do $$
begin
  if to_regclass('public.time_entries') is not null then
    alter table public.time_entries
    drop constraint if exists time_entries_site_id_fkey;
  end if;
end $$;

alter table public.sites
drop constraint if exists sites_pkey;

alter table public.sites
alter column site_id type text using site_id::text;

alter table public.clock_events
alter column site_id type text using site_id::text;

do $$
begin
  if to_regclass('public.time_entries') is not null then
    alter table public.time_entries
    alter column site_id type text using site_id::text;
  end if;
end $$;

alter table public.sites
alter column site_id set default public.generate_site_id();

update public.sites s
set company_name = c.name
from public.companies c
where c.id = s.company_id
  and (s.company_name is null or s.company_name <> c.name);

alter table public.sites
alter column site_id set not null;

alter table public.sites
alter column company_id set not null;

alter table public.sites
alter column company_name set not null;

alter table public.sites
alter column name set not null;

alter table public.sites
alter column lat set not null;

alter table public.sites
alter column lon set not null;

alter table public.sites
alter column radius_m set not null;

alter table public.sites
drop constraint if exists sites_radius_m_check;

alter table public.sites
add constraint sites_radius_m_check
check (radius_m >= 20 and radius_m <= 25000);

-- Keep global site IDs like S01, S02 unique, matching the original table.
alter table public.sites
add constraint sites_pkey primary key (site_id);

alter table public.clock_events
add constraint clock_events_site_id_fkey
foreign key (site_id)
references public.sites(site_id);

do $$
begin
  if to_regclass('public.time_entries') is not null then
    alter table public.time_entries
    add constraint time_entries_site_id_fkey
    foreign key (site_id)
    references public.sites(site_id);
  end if;
end $$;

create index if not exists sites_company_id_idx
on public.sites(company_id);

create index if not exists sites_company_name_idx
on public.sites(company_name);

alter table public.sites enable row level security;

drop policy if exists "members can view company sites" on public.sites;
create policy "members can view company sites"
on public.sites for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = sites.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "admins can manage company sites" on public.sites;
create policy "admins can manage company sites"
on public.sites for all
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = sites.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = sites.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);

-- Replace clock_batch with text site IDs.
drop function if exists public.clock_batch(uuid, text, text, uuid, double precision, double precision, integer, text[]);

create or replace function public.clock_batch(
  p_company_id uuid,
  p_action text,
  p_supervisor_code text,
  p_site_id text,
  p_lat double precision,
  p_lon double precision,
  p_accuracy_m integer,
  p_employee_ids text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_member boolean;
  v_site sites%rowtype;
  v_distance double precision;
  v_emp_id text;
  v_emp employees%rowtype;
  v_supervisor supervisors%rowtype;
  v_last_action text;
  v_results jsonb := '[]'::jsonb;
  v_ok boolean;
  v_message text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select exists (
    select 1 from public.company_users cu
    where cu.company_id = p_company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'supervisor')
  ) into v_is_member;

  if not v_is_member then
    raise exception 'No access to this company';
  end if;

  if p_action not in ('IN', 'OUT') then
    raise exception 'Invalid clock action';
  end if;

  if p_accuracy_m > 50 then
    raise exception 'GPS accuracy too low';
  end if;

  select * into v_site
  from public.sites
  where site_id = p_site_id
    and company_id = p_company_id
    and active = true;

  if not found then
    raise exception 'Site not found for this company';
  end if;

  v_distance := public.distance_meters(p_lat, p_lon, v_site.lat, v_site.lon);
  if v_distance > v_site.radius_m then
    raise exception 'Outside site radius';
  end if;

  select * into v_supervisor
  from public.supervisors
  where company_id = p_company_id
    and code = upper(trim(p_supervisor_code))
    and active = true;

  if not found then
    raise exception 'Invalid supervisor code';
  end if;

  foreach v_emp_id in array p_employee_ids loop
    v_ok := false;
    v_message := '';

    select * into v_emp
    from public.employees
    where company_id = p_company_id
      and employee_id = upper(trim(v_emp_id))
      and active = true;

    if not found then
      v_message := 'Employee not found or inactive';
    else
      select ce.action into v_last_action
      from public.clock_events ce
      where ce.company_id = p_company_id
        and ce.employee_id = v_emp.employee_id
      order by ce.created_at desc, ce.id desc
      limit 1;

      if p_action = 'IN' and v_last_action = 'IN' then
        v_message := 'Already clocked in';
      elsif p_action = 'OUT' and coalesce(v_last_action, 'OUT') <> 'IN' then
        v_message := 'Not clocked in';
      else
        insert into public.clock_events (
          company_id, company_name, employee_id, site_id, action, supervisor_code,
          lat, lon, accuracy_m, created_by
        ) values (
          p_company_id, v_site.company_name, v_emp.employee_id, p_site_id, p_action, v_supervisor.code,
          p_lat, p_lon, p_accuracy_m, auth.uid()
        );

        v_ok := true;
        v_message := 'Clocked ' || p_action;
      end if;
    end if;

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'employeeId', upper(trim(v_emp_id)),
      'employeeName', coalesce(v_emp.full_name, ''),
      'supervisorId', coalesce(v_supervisor.supervisor_id, ''),
      'supervisorName', coalesce(v_supervisor.full_name, ''),
      'ok', v_ok,
      'message', v_message
    ));
  end loop;

  return jsonb_build_object('results', v_results);
end;
$$;

grant execute on function public.clock_batch(uuid, text, text, text, double precision, double precision, integer, text[]) to authenticated;

select site_id, company_id, company_name, name, lat, lon, radius_m, active
from public.sites
order by site_id;
