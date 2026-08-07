-- TR Electrical: automatically close unresolved shifts at 17:00 after the
-- 20:00 review. The processor remains shared with MCK Power and uses each
-- company's configured review time in its audit message.

create or replace function public.process_company_auto_clock_outs(
  p_now timestamp with time zone default now()
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rule public.company_auto_clock_out_rules%rowtype;
  v_candidate record;
  v_today date;
  v_local_time time without time zone;
  v_source_work_date date;
  v_source_local_time time without time zone;
  v_out_work_date date;
  v_scheduled_out timestamp with time zone;
  v_message text;
  v_audit_id uuid;
  v_auto_entry_id uuid;
  v_auto_count integer := 0;
begin
  for v_rule in
    select *
    from public.company_auto_clock_out_rules
    where active = true
  loop
    v_today := (p_now at time zone v_rule.timezone)::date;
    v_local_time := (p_now at time zone v_rule.timezone)::time;

    for v_candidate in
      select
        employee.employee_id,
        employee.full_name as employee_name,
        latest.entry_id as source_entry_id,
        latest.created_at as source_created_at,
        latest.site_id,
        latest.site_name,
        latest.lat,
        latest.lon,
        latest.accuracy_m,
        latest.distance_m
      from public.employees employee
      join lateral (
        select event.*
        from public.clock_events event
        where event.company_id = employee.company_id
          and event.employee_id = employee.employee_id
          and event.result = 'OK'
          and event.created_at <= p_now
        order by event.created_at desc, event.entry_id desc
        limit 1
      ) latest on true
      where employee.company_id = v_rule.company_id
        and employee.active = true
        and latest.action = 'IN'
    loop
      v_source_work_date := (
        v_candidate.source_created_at at time zone v_rule.timezone
      )::date;
      v_source_local_time := (
        v_candidate.source_created_at at time zone v_rule.timezone
      )::time;

      if v_source_local_time <= v_rule.automatic_out_time then
        v_out_work_date := v_source_work_date;
        v_message := format(
          'AUTO CLOCK-OUT FLAG: No manual clock-out by %s; recorded at %s',
          to_char(v_rule.review_time, 'HH24:MI'),
          to_char(v_rule.automatic_out_time, 'HH24:MI')
        );
      else
        v_out_work_date := v_source_work_date + 1;
        v_message := format(
          'AUTO CLOCK-OUT FLAG: New late shift had no manual clock-out by the following day at %s; recorded at %s',
          to_char(v_rule.review_time, 'HH24:MI'),
          to_char(v_rule.automatic_out_time, 'HH24:MI')
        );
      end if;

      if v_out_work_date > v_today
         or (v_out_work_date = v_today and v_local_time < v_rule.review_time) then
        continue;
      end if;

      v_scheduled_out := (
        v_out_work_date + v_rule.automatic_out_time
      ) at time zone v_rule.timezone;
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
        v_rule.company_id,
        v_candidate.employee_id,
        v_candidate.employee_name,
        v_source_work_date,
        'auto_clocked_out',
        v_scheduled_out,
        p_now,
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
      )
      select
        company.id,
        company.name,
        v_scheduled_out,
        'OUT',
        v_candidate.employee_id,
        v_candidate.employee_name,
        'SYSTEM',
        v_candidate.site_id,
        v_candidate.site_name,
        v_candidate.lat,
        v_candidate.lon,
        v_candidate.accuracy_m,
        v_candidate.distance_m,
        'OK',
        v_message,
        null,
        'Shiftly Automatic Clock-Out'
      from public.companies company
      where company.id = v_rule.company_id
      returning entry_id into v_auto_entry_id;

      update public.company_auto_clock_out_audit
      set auto_out_entry_id = v_auto_entry_id
      where id = v_audit_id;

      v_auto_count := v_auto_count + 1;
    end loop;
  end loop;

  return v_auto_count;
end;
$$;

revoke all on function public.process_company_auto_clock_outs(timestamp with time zone)
from public, anon, authenticated;

insert into public.company_auto_clock_out_rules (
  company_id,
  active,
  timezone,
  automatic_out_time,
  review_time,
  updated_at
)
select
  company.id,
  true,
  'Africa/Johannesburg',
  '17:00'::time,
  '20:00'::time,
  now()
from public.companies company
where company.id = 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid
  and company.name = 'TR Electrical Solutions and Services'
on conflict (company_id)
do update set
  active = true,
  timezone = excluded.timezone,
  automatic_out_time = excluded.automatic_out_time,
  review_time = excluded.review_time,
  updated_at = now();

do $$
begin
  if not exists (
    select 1
    from public.company_auto_clock_out_rules
    where company_id = 'f50d8e62-3006-462e-b2a9-b1cf7c500394'::uuid
      and active = true
      and timezone = 'Africa/Johannesburg'
      and automatic_out_time = '17:00'::time
      and review_time = '20:00'::time
  ) then
    raise exception 'TR Electrical automatic clock-out rule could not be configured';
  end if;
end;
$$;

-- Close every currently stale TR Electrical IN before the new rule continues
-- on the existing five-minute server schedule.
select public.process_company_auto_clock_outs();
