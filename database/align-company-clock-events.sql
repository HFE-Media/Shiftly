-- Shiftly: rebuild clock_events to match the old time_entries shape exactly,
-- with only company_id and company_name added for multi-company support.
--
-- Final shape:
--   clock_events.entry_id uuid primary key
--   company_id uuid
--   company_name text
--   then the same fields as your original time_entries table.
--
-- Important:
--   This uses company-scoped foreign keys, so E001 and S02 can exist in
--   multiple companies without conflict.

do $$
begin
  if to_regclass('public.clock_events_backup_before_time_entries_shape') is null
     and to_regclass('public.clock_events') is not null then
    begin
      alter table public.clock_events
      rename constraint clock_events_pkey to clock_events_backup_before_time_entries_shape_pkey;
    exception
      when undefined_object or duplicate_object then null;
    end;

    alter table public.clock_events
    rename to clock_events_backup_before_time_entries_shape;
  elsif to_regclass('public.clock_events_backup_before_time_entries_shape') is not null then
    begin
      alter table public.clock_events_backup_before_time_entries_shape
      rename constraint clock_events_pkey to clock_events_backup_before_time_entries_shape_pkey;
    exception
      when undefined_object or duplicate_object then null;
    end;
  end if;
end $$;

create table public.clock_events (
  entry_id uuid not null default gen_random_uuid(),
  company_id uuid not null,
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
  constraint clock_events_pkey primary key (entry_id),
  constraint clock_events_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade,
  constraint clock_events_company_id_employee_id_fkey
    foreign key (company_id, employee_id) references public.employees(company_id, employee_id),
  constraint clock_events_company_id_site_id_fkey
    foreign key (company_id, site_id) references public.sites(company_id, site_id),
  constraint clock_events_action_check
    check (action = any (array['IN'::text, 'OUT'::text])),
  constraint clock_events_result_check
    check (result = any (array['OK'::text, 'BLOCKED'::text]))
) tablespace pg_default;

create index if not exists idx_clock_events_employee_time
on public.clock_events using btree (company_id, employee_id, created_at desc)
tablespace pg_default;

create index if not exists clock_events_company_name_idx
on public.clock_events using btree (company_name)
tablespace pg_default;

create index if not exists clock_events_company_site_time_idx
on public.clock_events using btree (company_id, site_id, created_at desc)
tablespace pg_default;

drop trigger if exists set_clock_events_company_name on public.clock_events;

create trigger set_clock_events_company_name
before insert or update of company_id
on public.clock_events
for each row
execute function public.set_company_name_from_company_id();

alter table public.clock_events enable row level security;

drop policy if exists "members can view company clock events" on public.clock_events;
create policy "members can view company clock events"
on public.clock_events for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = clock_events.company_id
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
  v_site public.sites%rowtype;
  v_distance double precision;
  v_emp_id text;
  v_emp public.employees%rowtype;
  v_supervisor public.supervisors%rowtype;
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
    select 1
    from public.company_users cu
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
  where company_id = p_company_id
    and site_id = upper(trim(p_site_id))
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
      select ce.action into v_last_action
      from public.clock_events ce
      where ce.company_id = p_company_id
        and ce.employee_id = v_emp.employee_id
        and ce.result = 'OK'
      order by ce.created_at desc, ce.entry_id desc
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

    insert into public.clock_events (
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
      v_emp.employee_id,
      v_emp.full_name,
      v_supervisor.code,
      v_site.site_id,
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
      'employeeId', v_emp.employee_id,
      'employeeName', v_emp.full_name,
      'supervisorId', coalesce(v_supervisor.supervisor_id, ''),
      'supervisorName', coalesce(v_supervisor.full_name, ''),
      'ok', v_ok,
      'message', v_message
    ));
  end loop;

  return jsonb_build_object('results', v_results);
end;
$$;

grant execute on function public.clock_batch(
  uuid,
  text,
  text,
  text,
  double precision,
  double precision,
  integer,
  text[]
) to authenticated;

select
  entry_id,
  company_id,
  company_name,
  created_at,
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
from public.clock_events
order by created_at desc
limit 20;
