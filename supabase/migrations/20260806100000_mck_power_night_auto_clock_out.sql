-- MCK Power night-shift automatic clock-out.
-- An unresolved IN after 17:00 is treated as a night shift. From 06:30 the
-- following morning, it is automatically closed at 06:00 and flagged.

alter table public.company_auto_clock_out_rules
add column if not exists night_shift_enabled boolean not null default false;

alter table public.company_auto_clock_out_rules
add column if not exists night_shift_start_time time without time zone null;

alter table public.company_auto_clock_out_rules
add column if not exists night_automatic_out_time time without time zone null;

alter table public.company_auto_clock_out_rules
add column if not exists night_review_time time without time zone null;

alter table public.company_auto_clock_out_rules
drop constraint if exists company_auto_clock_out_rules_night_time_check;

alter table public.company_auto_clock_out_rules
add constraint company_auto_clock_out_rules_night_time_check
check (
  night_shift_enabled = false
  or (
    night_shift_start_time is not null
    and night_automatic_out_time is not null
    and night_review_time is not null
    and night_review_time > night_automatic_out_time
  )
);

update public.company_auto_clock_out_rules
set night_shift_enabled = true,
    night_shift_start_time = '17:00'::time,
    night_automatic_out_time = '06:00'::time,
    night_review_time = '06:30'::time,
    updated_at = now()
where company_id = '4ca8c47f-3959-468b-bd8a-734f38874623'::uuid;

create or replace function public.process_company_night_auto_clock_outs(
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
      and night_shift_enabled = true
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

      if v_source_local_time <= v_rule.night_shift_start_time then
        continue;
      end if;

      v_out_work_date := v_source_work_date + 1;
      if v_out_work_date > v_today
         or (v_out_work_date = v_today and v_local_time < v_rule.night_review_time) then
        continue;
      end if;

      v_scheduled_out := (
        v_out_work_date + v_rule.night_automatic_out_time
      ) at time zone v_rule.timezone;
      v_message := format(
        'AUTO CLOCK-OUT FLAG: Night shift had no manual clock-out by %s; recorded at %s',
        to_char(v_rule.night_review_time, 'HH24:MI'),
        to_char(v_rule.night_automatic_out_time, 'HH24:MI')
      );
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

revoke all on function public.process_company_night_auto_clock_outs(timestamp with time zone)
from public, anon, authenticated;

do $$
declare
  v_job_id bigint;
begin
  if not exists (
    select 1
    from public.company_auto_clock_out_rules
    where company_id = '4ca8c47f-3959-468b-bd8a-734f38874623'::uuid
      and active = true
      and night_shift_enabled = true
      and night_shift_start_time = '17:00'::time
      and night_automatic_out_time = '06:00'::time
      and night_review_time = '06:30'::time
  ) then
    raise exception 'MCK Power night automatic clock-out rule could not be configured';
  end if;

  select jobid into v_job_id
  from cron.job
  where jobname = 'shiftly-process-company-night-auto-clock-outs';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'shiftly-process-company-night-auto-clock-outs',
    '*/5 * * * *',
    'select public.process_company_night_auto_clock_outs();'
  );
end;
$$;

select public.process_company_night_auto_clock_outs();
