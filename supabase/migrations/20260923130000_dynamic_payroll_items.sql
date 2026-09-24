-- Phase 1 foundation for stable, selectable payroll items.
-- Seeded items are intentionally unclassified and calculation-inert.
begin;

create table public.payroll_item_definitions (
  id uuid primary key,
  item_key text not null unique check (item_key ~ '^[a-z][a-z0-9_]{2,63}$'),
  display_name text not null check (length(trim(display_name)) between 2 and 100),
  item_type text not null check (item_type in ('adjustment','deduction')),
  classification_status text not null default 'unclassified' check (classification_status in ('unclassified','authoritative')),
  sars_source_code text,
  paye_treatment text,
  uif_treatment text,
  sdl_treatment text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payroll_item_definitions_phase1_unclassified check (
    classification_status <> 'unclassified'
    or (sars_source_code is null and paye_treatment is null and uif_treatment is null and sdl_treatment is null)
  )
);

alter table public.payroll_item_definitions enable row level security;
create policy "authenticated users can view active payroll item definitions"
on public.payroll_item_definitions for select to authenticated using (active);
revoke all on table public.payroll_item_definitions from public,anon,authenticated;
grant select on table public.payroll_item_definitions to authenticated;

insert into public.payroll_item_definitions(id,item_key,display_name,item_type)
values
  ('3f4c6f32-4486-4bb5-b437-6573d388b01a','travel_allowance','Travel Allowance','adjustment'),
  ('7a2c18e6-705a-4e82-bf70-eb141e755b76','unclassified_deduction','Unclassified Deduction','deduction');

alter table public.payroll_adjustments
  add column payroll_item_definition_id uuid references public.payroll_item_definitions(id);
alter table public.payroll_deductions
  add column payroll_item_definition_id uuid references public.payroll_item_definitions(id);

alter table public.payroll_adjustments drop constraint if exists payroll_adjustments_type_check;
alter table public.payroll_adjustments add constraint payroll_adjustments_type_check check (
  adjustment_type in ('paid_leave','allowance','bonus','manual_normal_hours','manual_ot1','manual_ot2','dynamic')
);
alter table public.payroll_adjustments add constraint payroll_adjustments_dynamic_identity_check check (
  (adjustment_type='dynamic')=(payroll_item_definition_id is not null)
);
alter table public.payroll_deductions add constraint payroll_deductions_dynamic_identity_check check (
  payroll_item_definition_id is null or deduction_type_id is null
);

create unique index payroll_adjustments_one_active_dynamic_item
on public.payroll_adjustments(company_id,employee_id,period_start,period_end,payroll_item_definition_id)
where active and payroll_item_definition_id is not null;
create unique index payroll_deductions_one_active_dynamic_item
on public.payroll_deductions(company_id,employee_id,period_start,period_end,payroll_item_definition_id)
where active and payroll_item_definition_id is not null;

create function public.payroll_validate_dynamic_item() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare expected_type text; definition public.payroll_item_definitions;
begin
  if new.payroll_item_definition_id is null then return new; end if;
  expected_type:=case when tg_table_name='payroll_adjustments' then 'adjustment' else 'deduction' end;
  select * into definition from public.payroll_item_definitions d
    where d.id=new.payroll_item_definition_id and d.active;
  if definition.id is null or definition.item_type<>expected_type or definition.classification_status<>'unclassified' then
    raise exception 'Invalid or unsupported dynamic payroll item';
  end if;
  new.description:=definition.display_name;
  if expected_type='adjustment' then new.adjustment_type:='dynamic'; new.hours:=0; end if;
  if expected_type='deduction' then new.deduction_type_id:=null; end if;
  return new;
end $$;

create trigger validate_dynamic_payroll_adjustment
before insert or update of payroll_item_definition_id,description,adjustment_type,hours
on public.payroll_adjustments for each row execute function public.payroll_validate_dynamic_item();
create trigger validate_dynamic_payroll_deduction
before insert or update of payroll_item_definition_id,description,deduction_type_id
on public.payroll_deductions for each row execute function public.payroll_validate_dynamic_item();

revoke all on function public.payroll_validate_dynamic_item() from public,anon,authenticated;

-- Existing payroll inputs/revisions automatically include the new value columns
-- through to_jsonb. Definitions are calculation-inert in Phase 1.
commit;
