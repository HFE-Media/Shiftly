-- Shiftly: Mixocron-only payroll profile.
-- This keeps the app UI clean while applying Mixocron's site-specific time-window rule.
--
-- Rule:
-- - Clock-ins before 07:30 count from 07:30.
-- - Monday to Thursday normal time stops at 16:30.
-- - Monday to Thursday overtime only starts when clock-out is 16:50 or later.
-- - If clock-out is 16:50, OT1 counts from 16:30, so it is 20 minutes OT.
-- - Friday normal time stops at 13:30.
-- - Friday overtime only starts when clock-out is 13:50 or later.
-- - If clock-out is 13:50 on Friday, OT1 counts from 13:30, so it is 20 minutes OT.
-- - Lunch is not deducted by payroll because Mixocron's clock machine records lunch OUT/IN pairs.

alter table public.company_payroll_rules
add column if not exists payroll_profile text not null default 'standard';

alter table public.company_payroll_rules
add column if not exists paid_start_time time null;

alter table public.company_payroll_rules
add column if not exists normal_end_time time null;

alter table public.company_payroll_rules
add column if not exists overtime_trigger_time time null;

alter table public.company_payroll_rules
add column if not exists friday_normal_end_time time null;

alter table public.company_payroll_rules
add column if not exists friday_overtime_trigger_time time null;

alter table public.company_payroll_rules
drop constraint if exists company_payroll_rules_profile_check;

alter table public.company_payroll_rules
add constraint company_payroll_rules_profile_check
check (payroll_profile = any (array['standard'::text, 'mixocron'::text]));

alter table public.company_payroll_rules
drop constraint if exists company_payroll_rules_time_window_check;

alter table public.company_payroll_rules
add constraint company_payroll_rules_time_window_check
check (
  normal_end_time is null
  or overtime_trigger_time is null
  or overtime_trigger_time >= normal_end_time
);

alter table public.company_payroll_rules
drop constraint if exists company_payroll_rules_friday_time_window_check;

alter table public.company_payroll_rules
add constraint company_payroll_rules_friday_time_window_check
check (
  friday_normal_end_time is null
  or friday_overtime_trigger_time is null
  or friday_overtime_trigger_time >= friday_normal_end_time
);

insert into public.company_payroll_rules (
  company_id,
  company_name,
  payroll_profile,
  paid_start_time,
  normal_end_time,
  overtime_trigger_time,
  friday_normal_end_time,
  friday_overtime_trigger_time,
  overtime_method,
  work_week_enabled,
  work_week,
  daily_overtime_enabled,
  lunch_deduction_enabled,
  lunch_deduction_minutes,
  active
)
select
  c.id,
  c.name,
  'mixocron',
  '07:30'::time,
  '16:30'::time,
  '16:50'::time,
  '13:30'::time,
  '13:50'::time,
  'daily_cycle',
  true,
  '{
    "mon": {"normal_hours": 8.5, "rule": "threshold"},
    "tue": {"normal_hours": 8.5, "rule": "threshold"},
    "wed": {"normal_hours": 8.5, "rule": "threshold"},
    "thu": {"normal_hours": 8.5, "rule": "threshold"},
    "fri": {"normal_hours": 6, "rule": "threshold"},
    "sat": {"normal_hours": 0, "rule": "ot1"},
    "sun": {"normal_hours": 0, "rule": "ot2"}
  }'::jsonb,
  true,
  false,
  0,
  true
from public.companies c
where lower(c.name) = 'mixocron'
   or lower(c.slug) = 'mixocron'
on conflict (company_id)
do update set
  company_name = excluded.company_name,
  payroll_profile = excluded.payroll_profile,
  paid_start_time = excluded.paid_start_time,
  normal_end_time = excluded.normal_end_time,
  overtime_trigger_time = excluded.overtime_trigger_time,
  friday_normal_end_time = excluded.friday_normal_end_time,
  friday_overtime_trigger_time = excluded.friday_overtime_trigger_time,
  overtime_method = excluded.overtime_method,
  work_week_enabled = excluded.work_week_enabled,
  work_week = excluded.work_week,
  daily_overtime_enabled = excluded.daily_overtime_enabled,
  lunch_deduction_enabled = excluded.lunch_deduction_enabled,
  lunch_deduction_minutes = excluded.lunch_deduction_minutes,
  active = excluded.active;

select
  c.id as company_id,
  c.name as company_name,
  r.payroll_profile,
  r.paid_start_time,
  r.normal_end_time,
  r.overtime_trigger_time,
  r.friday_normal_end_time,
  r.friday_overtime_trigger_time,
  r.overtime_method,
  r.work_week,
  r.lunch_deduction_minutes
from public.companies c
join public.company_payroll_rules r on r.company_id = c.id
where lower(c.name) = 'mixocron'
   or lower(c.slug) = 'mixocron';
