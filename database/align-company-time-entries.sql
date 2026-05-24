-- Shiftly: align clocking history with the original time_entries schema.
-- Adds company_id and company_name for multi-company use.
--
-- After this, clock_batch writes to public.time_entries.
-- public.clock_events can remain as old/test history, but it is no longer the main table.

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
add column if not exists company_id uuid references public.companies(id) on delete cascade;

alter table public.time_entries
add column if not exists company_name text;

alter table public.time_entries
add column if not exists employee_name text;

alter table public.time_entries
add column if not exists site_name text;

alter table public.time_entries
add column if not exists supervisor_id text;

alter table public.time_entries
add column if not exists supervisor_name text;

alter table public.time_entries
add column if not exists distance_m integer;

alter table public.time_entries
add column if not exists result text;

alter table public.time_entries
add column if not exists message text;

update public.time_entries te
set company_name = c.name
from public.companies c
where c.id = te.company_id
  and (te.company_name is null or te.company_name <> c.name);

update public.time_entries te
set employee_name = e.full_name
from public.employees e
where e.company_id = te.company_id
  and e.employee_id = te.employee_id
  and (te.employee_name is null or te.employee_name = '');

update public.time_entries te
set site_name = s.name
from public.sites s
where s.company_id = te.company_id
  and s.site_id = te.site_id
  and (te.site_name is null or te.site_name = '');

update public.time_entries te
set
  supervisor_id = s.supervisor_id,
  supervisor_name = s.full_name
from public.supervisors s
where s.company_id = te.company_id
  and s.code = te.supervisor_code
  and (te.supervisor_id is null or te.supervisor_name is null);

update public.time_entries
set distance_m = coalesce(distance_m, 0),
    result = coalesce(result, 'OK'),
    message = coalesce(message, '')
where distance_m is null
   or result is null
   or message is null;

alter table public.time_entries
alter column company_id set not null;

alter table public.time_entries
alter column company_name set not null;

alter table public.time_entries
alter column employee_name set not null;

alter table public.time_entries
alter column site_name set not null;

alter table public.time_entries
alter column distance_m set not null;

alter table public.time_entries
alter column result set not null;

alter table public.time_entries
alter column message set not null;

alter table public.time_entries
drop constraint if exists time_entries_employee_id_fkey;

alter table public.time_entries
drop constraint if exists time_entries_company_id_employee_id_fkey;

alter table public.time_entries
add constraint time_entries_company_id_employee_id_fkey
foreign key (company_id, employee_id)
references public.employees(company_id, employee_id);

alter table public.time_entries
drop constraint if exists time_entries_site_id_fkey;

alter table public.time_entries
drop constraint if exists time_entries_company_id_site_id_fkey;

alter table public.time_entries
add constraint time_entries_company_id_site_id_fkey
foreign key (company_id, site_id)
references public.sites(company_id, site_id);

alter table public.time_entries
drop constraint if exists time_entries_action_check;

alter table public.time_entries
add constraint time_entries_action_check
check (action = any (array['IN'::text, 'OUT'::text]));

alter table public.time_entries
drop constraint if exists time_entries_result_check;

alter table public.time_entries
add constraint time_entries_result_check
check (result = any (array['OK'::text, 'BLOCKED'::text]));

create index if not exists idx_time_entries_employee_time
on public.time_entries(company_id, employee_id, created_at desc);

create index if not exists idx_time_entries_company_time
on public.time_entries(company_id, created_at desc);

create index if not exists idx_time_entries_company_name
on public.time_entries(company_name);

alter table public.time_entries enable row level security;

drop policy if exists "members can view company time entries" on public.time_entries;
create policy "members can view company time entries"
on public.time_entries for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = time_entries.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop function if exists public.clock_batch(uuid, text, text, uuid, double precision, double precision, integer, text[]);
drop function if exists public.clock_batch(uuid, text, text, text, double precision, double precision, integer, text[]);

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
  v_company_name text;
  v_site sites%rowtype;
  v_distance double precision;
  v_emp_id text;
  v_emp employees%rowtype;
  v_supervisor supervisors%rowtype;
  v_last_action text;
  v_results jsonb := '[]'::jsonb;
  v_ok boolean;
  v_result text;
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

  select name into v_company_name
  from public.companies
  where id = p_company_id;

  if p_action not in ('IN', 'OUT') then
    raise exception 'Invalid clock action';
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
    v_result := 'BLOCKED';
    v_message := '';

    select * into v_emp
    from public.employees
    where company_id = p_company_id
      and employee_id = upper(trim(v_emp_id))
      and active = true;

    if not found then
      v_message := 'Employee not found or inactive';
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'employeeId', upper(trim(v_emp_id)),
        'employeeName', '',
        'supervisorId', coalesce(v_supervisor.supervisor_id, ''),
        'supervisorName', coalesce(v_supervisor.full_name, ''),
        'ok', false,
        'message', v_message
      ));
      continue;
    elsif p_accuracy_m > 50 then
      v_message := 'GPS accuracy too low';
    elsif v_distance > v_site.radius_m then
      v_message := 'Outside site radius';
    else
      select te.action into v_last_action
      from public.time_entries te
      where te.company_id = p_company_id
        and te.employee_id = v_emp.employee_id
        and te.result = 'OK'
      order by te.created_at desc, te.entry_id desc
      limit 1;

      if p_action = 'IN' and v_last_action = 'IN' then
        v_message := 'Already clocked in';
      elsif p_action = 'OUT' and coalesce(v_last_action, 'OUT') <> 'IN' then
        v_message := 'Not clocked in';
      else
        v_ok := true;
        v_result := 'OK';
        v_message := 'Clocked ' || p_action;
      end if;
    end if;

    insert into public.time_entries (
      company_id,
      company_name,
      action,
      employee_id,
      employee_name,
      supervisor_code,
      site_id,
      site_name,
      lat,
      lon,
      accuracy_m,
      distance_m,
      result,
      message,
      supervisor_id,
      supervisor_name
    ) values (
      p_company_id,
      coalesce(v_site.company_name, v_company_name),
      p_action,
      upper(trim(v_emp_id)),
      coalesce(v_emp.full_name, ''),
      v_supervisor.code,
      p_site_id,
      v_site.name,
      p_lat,
      p_lon,
      p_accuracy_m,
      round(v_distance)::integer,
      v_result,
      v_message,
      v_supervisor.supervisor_id,
      v_supervisor.full_name
    );

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

select
  entry_id,
  company_name,
  action,
  employee_id,
  employee_name,
  supervisor_code,
  supervisor_name,
  site_id,
  site_name,
  result,
  message,
  created_at
from public.time_entries
order by created_at desc
limit 20;
