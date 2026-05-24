-- Shiftly: add company-scoped supervisor clocking codes.
-- Run this in the TEST Supabase project.
--
-- Admin codes remain in public.admins and are used only for Add Site/admin UI.
-- Supervisor codes live here and are used by clock_batch for clock IN/OUT.

create table if not exists public.supervisors (
  supervisor_id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  full_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint supervisors_pkey primary key (company_id, supervisor_id),
  constraint supervisors_company_code_key unique (company_id, code)
);

create index if not exists supervisors_company_code_idx
on public.supervisors(company_id, code);

alter table public.supervisors enable row level security;

drop policy if exists "members can view company supervisors" on public.supervisors;
create policy "members can view company supervisors"
on public.supervisors for select
to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = supervisors.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

-- HFE Media supervisor examples.
insert into public.supervisors (company_id, supervisor_id, code, full_name, active)
values
  ('7721bc3a-272c-4e4d-97e9-d9d6107bf42a', 'SUP01', '384981', 'Francois Engelbrecht', true),
  ('7721bc3a-272c-4e4d-97e9-d9d6107bf42a', 'SUP02', '482913', 'Hlamalani Vusi Sithole', true),
  ('7721bc3a-272c-4e4d-97e9-d9d6107bf42a', 'SUP03', '709562', 'Juandré De Bruin', true)
on conflict (company_id, supervisor_id)
do update set
  code = excluded.code,
  full_name = excluded.full_name,
  active = excluded.active;

-- Keep HFE Media admin/add-site code separate.
-- This code can reveal Add Site in the app.
insert into public.admins (company_id, code, full_name, active)
values ('7721bc3a-272c-4e4d-97e9-d9d6107bf42a', '999111', 'Francois Engelbrecht', true)
on conflict (company_id, code)
do update set full_name = excluded.full_name, active = true;

-- Replace clock_batch so clocking validates public.supervisors, not public.admins.
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
          company_id, employee_id, site_id, action, supervisor_code,
          lat, lon, accuracy_m, created_by
        ) values (
          p_company_id, v_emp.employee_id, p_site_id, p_action, v_supervisor.code,
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

select 'supervisor' as type, supervisor_id as id, code, full_name, active
from public.supervisors
where company_id = '7721bc3a-272c-4e4d-97e9-d9d6107bf42a'
union all
select 'admin' as type, '' as id, code, full_name, active
from public.admins
where company_id = '7721bc3a-272c-4e4d-97e9-d9d6107bf42a'
order by type, code;
