-- PVS Construction and PVS Waterproofing: close unresolved daily shifts at
-- 17:00 once the 23:59 review threshold has passed. The shared processor also
-- catches older unresolved IN events and records each automatic OUT in the
-- existing audit ledger.

with expected_company (company_id, company_name) as (
  values
    (
      '276c7308-8944-41de-bf48-f32ddfec4933'::uuid,
      'PVS Waterproofing'::text
    ),
    (
      '58f6d52b-fc34-4976-8330-c661008942ce'::uuid,
      'PVS Construction'::text
    )
)
insert into public.company_auto_clock_out_rules (
  company_id,
  active,
  timezone,
  automatic_out_time,
  review_time,
  night_shift_enabled,
  updated_at
)
select
  company.id,
  true,
  'Africa/Johannesburg',
  '17:00'::time,
  '23:59'::time,
  false,
  now()
from public.companies company
join expected_company expected
  on expected.company_id = company.id
 and expected.company_name = company.name
on conflict (company_id)
do update set
  active = true,
  timezone = excluded.timezone,
  automatic_out_time = excluded.automatic_out_time,
  review_time = excluded.review_time,
  night_shift_enabled = false,
  updated_at = now();

do $$
begin
  if (
    select count(*)
    from public.company_auto_clock_out_rules
    where company_id in (
      '276c7308-8944-41de-bf48-f32ddfec4933'::uuid,
      '58f6d52b-fc34-4976-8330-c661008942ce'::uuid
    )
      and active = true
      and timezone = 'Africa/Johannesburg'
      and automatic_out_time = '17:00'::time
      and review_time = '23:59'::time
      and night_shift_enabled = false
  ) <> 2 then
    raise exception 'PVS automatic clock-out rules could not be configured';
  end if;
end;
$$;

-- Close any currently stale PVS shifts immediately. Future shifts continue on
-- the existing five-minute automatic clock-out schedule.
select public.process_company_auto_clock_outs();
