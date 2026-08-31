-- One-time correction requested for PVS Construction, site S08, on
-- 20 August 2026. This script targets only the five listed employees and does
-- not change the permanent automatic clock-out rule.

do $$
declare
  v_company_id constant uuid :=
    '58f6d52b-fc34-4976-8330-c661008942ce'::uuid;
  v_work_date constant date := date '2026-08-20';
  v_site public.sites%rowtype;
  v_candidate record;
  v_scheduled_out timestamp with time zone;
  v_end_of_day timestamp with time zone;
  v_audit_id uuid;
  v_auto_entry_id uuid;
  v_message constant text :=
    'AUTO CLOCK-OUT FLAG: One-off S08 correction; recorded at 22:54';
begin
  if not exists (
    select 1
    from public.companies
    where id = v_company_id
      and name = 'PVS Construction'
  ) then
    raise exception 'PVS Construction company record was not found';
  end if;

  select * into v_site
  from public.sites
  where company_id = v_company_id
    and site_id = 'S08';

  if not found then
    raise exception 'PVS Construction site S08 was not found';
  end if;

  if (
    select count(*)
    from public.employees
    where company_id = v_company_id
      and employee_id in (
        'PVSC006',
        'PVSC033',
        'PVSC034',
        'PVSC035',
        'PVSC036'
      )
  ) <> 5 then
    raise exception 'One or more targeted PVS Construction employees were not found';
  end if;

  v_scheduled_out := (
    v_work_date + '22:54'::time
  ) at time zone 'Africa/Johannesburg';
  v_end_of_day := (
    v_work_date + 1
  )::timestamp at time zone 'Africa/Johannesburg';

  for v_candidate in
    select
      employee.employee_id,
      employee.full_name as employee_name,
      source_in.entry_id as source_entry_id,
      source_in.created_at as source_created_at,
      source_in.lat,
      source_in.lon,
      source_in.accuracy_m,
      source_in.distance_m
    from public.employees employee
    left join lateral (
      select event.*
      from public.clock_events event
      where event.company_id = employee.company_id
        and event.employee_id = employee.employee_id
        and event.site_id = 'S08'
        and event.action = 'IN'
        and event.result = 'OK'
        and (
          event.created_at at time zone 'Africa/Johannesburg'
        )::date = v_work_date
      order by event.created_at desc, event.entry_id desc
      limit 1
    ) source_in on true
    where employee.company_id = v_company_id
      and employee.employee_id in (
        'PVSC006',
        'PVSC033',
        'PVSC034',
        'PVSC035',
        'PVSC036'
      )
    order by employee.employee_id
  loop
    if v_candidate.source_entry_id is null then
      raise notice 'Skipped %: no valid S08 IN was found on 2026-08-20',
        v_candidate.employee_id;
      continue;
    end if;

    if v_candidate.source_created_at >= v_scheduled_out then
      raise notice 'Skipped %: the S08 IN is at or after 22:54',
        v_candidate.employee_id;
      continue;
    end if;

    if exists (
      select 1
      from public.clock_events existing_out
      where existing_out.company_id = v_company_id
        and existing_out.employee_id = v_candidate.employee_id
        and existing_out.action = 'OUT'
        and existing_out.result = 'OK'
        and existing_out.created_at > v_candidate.source_created_at
        and existing_out.created_at < v_end_of_day
    ) then
      raise notice 'Skipped %: a valid OUT already exists after the S08 IN',
        v_candidate.employee_id;
      continue;
    end if;

    v_audit_id := null;
    v_auto_entry_id := null;

    insert into public.company_auto_clock_out_audit (
      company_id,
      employee_id,
      employee_name,
      work_date,
      status,
      scheduled_out_at,
      detected_at,
      source_entry_id,
      message
    ) values (
      v_company_id,
      v_candidate.employee_id,
      v_candidate.employee_name,
      v_work_date,
      'auto_clocked_out',
      v_scheduled_out,
      now(),
      v_candidate.source_entry_id,
      v_message
    )
    on conflict (company_id, source_entry_id) do update
    set employee_name = excluded.employee_name,
        status = excluded.status,
        scheduled_out_at = excluded.scheduled_out_at,
        detected_at = excluded.detected_at,
        message = excluded.message
    where company_auto_clock_out_audit.auto_out_entry_id is null
    returning id into v_audit_id;

    if v_audit_id is null then
      raise notice 'Skipped %: this IN was already handled by an automatic OUT',
        v_candidate.employee_id;
      continue;
    end if;

    insert into public.clock_events (
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
    ) values (
      v_company_id,
      'PVS Construction',
      v_scheduled_out,
      'OUT',
      v_candidate.employee_id,
      v_candidate.employee_name,
      'SYSTEM',
      v_site.site_id,
      v_site.name,
      v_candidate.lat,
      v_candidate.lon,
      v_candidate.accuracy_m,
      v_candidate.distance_m,
      'OK',
      v_message,
      null,
      'Shiftly Automatic Clock-Out'
    )
    returning entry_id into v_auto_entry_id;

    update public.company_auto_clock_out_audit
    set auto_out_entry_id = v_auto_entry_id
    where id = v_audit_id;
  end loop;
end;
$$;

-- The result grid lists only the OUT events created by this correction.
select
  employee_id,
  employee_name,
  site_id,
  site_name,
  created_at at time zone 'Africa/Johannesburg' as local_out_time,
  action,
  message
from public.clock_events
where company_id = '58f6d52b-fc34-4976-8330-c661008942ce'::uuid
  and employee_id in (
    'PVSC006',
    'PVSC033',
    'PVSC034',
    'PVSC035',
    'PVSC036'
  )
  and message = 'AUTO CLOCK-OUT FLAG: One-off S08 correction; recorded at 22:54'
order by employee_id;
