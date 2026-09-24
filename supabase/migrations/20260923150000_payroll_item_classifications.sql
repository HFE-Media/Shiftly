-- Phase 2: versioned, system-controlled statutory classification metadata.
-- This migration is metadata-only. It does not activate any dynamic item in payroll,
-- payslips, finalisation, PAYE, UIF, SDL or financial history.
--
-- Authoritative sources (2027 year of assessment):
--   PAYE-AE-06-G06, revision 14, effective 18 September 2026
--   PAYE-GEN-01-G21, revision 1 (Guide for Employers for the 2027 tax year)
-- Effective ranges are [effective_from, effective_to), so a later tax-year version can
-- be added without changing the meaning frozen onto an earlier payroll value row.
begin;

alter table public.payroll_item_definitions
  add column selector_visible boolean not null default true;

alter table public.payroll_item_definitions
  drop constraint if exists payroll_item_definitions_classification_status_check;
alter table public.payroll_item_definitions
  add constraint payroll_item_definitions_classification_status_check check (
    classification_status in ('unclassified','partially_verified','authoritative')
  );

comment on column public.payroll_item_definitions.sars_source_code is
  'Phase 1 compatibility placeholder. Versioned statutory metadata is stored in payroll_item_classifications.';
comment on column public.payroll_item_definitions.paye_treatment is
  'Phase 1 compatibility placeholder. Versioned statutory metadata is stored in payroll_item_classifications.';
comment on column public.payroll_item_definitions.uif_treatment is
  'Phase 1 compatibility placeholder. Versioned statutory metadata is stored in payroll_item_classifications.';
comment on column public.payroll_item_definitions.sdl_treatment is
  'Phase 1 compatibility placeholder. Versioned statutory metadata is stored in payroll_item_classifications.';

create table public.payroll_item_classifications (
  id uuid primary key,
  payroll_item_definition_id uuid not null references public.payroll_item_definitions(id),
  classification_version text not null check (classification_version ~ '^[a-z0-9][a-z0-9._-]{2,63}$'),
  effective_from date not null,
  effective_to date not null,
  statutory_category text not null check (statutory_category ~ '^[a-z][a-z0-9_]{2,79}$'),
  sars_source_code text check (sars_source_code is null or sars_source_code ~ '^[0-9]{4}$'),
  paye_treatment text not null check (paye_treatment in (
    'subject_to_paye',
    'annual_payment_subject_to_paye',
    'allowable_deduction',
    'requires_context',
    'not_applicable_net_deduction',
    'unresolved'
  )),
  uif_treatment text not null check (uif_treatment in (
    'included_remuneration',
    'does_not_reduce_remuneration',
    'requires_context',
    'not_applicable_net_deduction',
    'unresolved'
  )),
  sdl_treatment text not null check (sdl_treatment in (
    'included_remuneration',
    'allowable_deduction',
    'does_not_reduce_leviable_amount',
    'requires_context',
    'not_applicable_net_deduction',
    'unresolved'
  )),
  calculation_status text not null default 'metadata_only'
    check (calculation_status = 'metadata_only'),
  authority_document text not null,
  authority_url text not null check (authority_url like 'https://www.sars.gov.za/%'),
  authority_note text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint payroll_item_classifications_valid_range check (effective_to > effective_from),
  unique (payroll_item_definition_id, classification_version)
);

comment on table public.payroll_item_classifications is
  'Immutable-by-client, effective-dated statutory metadata. Phase 2 records are calculation-inert.';
comment on column public.payroll_item_classifications.effective_to is
  'Exclusive upper bound of the statutory classification validity range.';

create function public.payroll_classification_no_overlap() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if exists (
    select 1
    from public.payroll_item_classifications c
    where c.payroll_item_definition_id = new.payroll_item_definition_id
      and c.id <> new.id
      and daterange(c.effective_from,c.effective_to,'[)')
          && daterange(new.effective_from,new.effective_to,'[)')
  ) then
    raise exception 'Payroll item classification effective ranges may not overlap';
  end if;
  return new;
end $$;

create trigger payroll_classification_reject_overlap
before insert or update of payroll_item_definition_id,effective_from,effective_to
on public.payroll_item_classifications for each row
execute function public.payroll_classification_no_overlap();

alter table public.payroll_item_classifications enable row level security;
create policy "authenticated users can view active payroll item classifications"
on public.payroll_item_classifications for select to authenticated using (active);
revoke all on table public.payroll_item_classifications from public,anon,authenticated;
grant select on table public.payroll_item_classifications to authenticated;
revoke all on function public.payroll_classification_no_overlap() from public,anon,authenticated;

-- Preserve the original Phase 1 placeholder for existing rows, but do not offer it
-- as a new selection once the authoritative catalogue is available.
update public.payroll_item_definitions
set selector_visible=false, updated_at=now()
where item_key='unclassified_deduction';

-- Friendly catalogue identities. Hidden entries document fixed Shiftly meanings but
-- do not migrate or replace fixed value rows.
-- Phase 3 still needs separate effective-dated company SDL applicability and employee
-- circumstances for paragraph 2(5)(a) exemption certificates and section 18(3)
-- learnership contracts. Those employee/company facts cannot be inferred from an item
-- classification and are deliberately not added in this phase.
insert into public.payroll_item_definitions
  (id,item_key,display_name,item_type,classification_status,selector_visible)
values
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df01','ordinary_remuneration','Ordinary Remuneration','adjustment','authoritative',false),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df02','commission','Commission','adjustment','authoritative',true),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df03','annual_bonus','Annual Bonus','adjustment','authoritative',false),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df04','overtime','Overtime','adjustment','authoritative',false),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df05','paid_leave_taken','Paid Leave','adjustment','partially_verified',false),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df06','legacy_generic_allowance','Allowance','adjustment','unclassified',false),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df07','local_subsistence_above_limit','Local Subsistence Allowance (Above Limit)','adjustment','partially_verified',true),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df08','pension_fund_contribution','Pension Fund Contribution','deduction','authoritative',true),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df09','provident_fund_contribution','Provident Fund Contribution','deduction','authoritative',true),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df0a','retirement_annuity_fund_contribution','Retirement Annuity Fund Contribution','deduction','authoritative',true),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df0b','qualifying_donation','Qualifying Donation','deduction','authoritative',true),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df0c','tools_ppe','Tools/PPE','deduction','authoritative',false),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df0d','fine','Fine','deduction','authoritative',false),
  ('0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df0e','loan','Loan','deduction','authoritative',false);

update public.payroll_item_definitions
set classification_status='partially_verified', selector_visible=true, updated_at=now()
where item_key='travel_allowance';

-- 2027 source codes below are supported by PAYE-AE-06-G06 revision 14.
-- PAYE/SDL treatments are additionally supported by PAYE-GEN-01-G21 revision 1.
insert into public.payroll_item_classifications
  (id,payroll_item_definition_id,classification_version,effective_from,effective_to,
   statutory_category,sars_source_code,paye_treatment,uif_treatment,sdl_treatment,
   authority_document,authority_url,authority_note)
values
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e101','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df01','za-2027-r14','2026-03-01','2027-03-01','ordinary_remuneration','3601','subject_to_paye','included_remuneration','included_remuneration','PAYE-AE-06-G06 rev 14; PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/paye-ae-06-g06-guide-for-codes-applicable-to-employees-tax-certificates-2027-external-guide/','3601 salary/wages; remuneration is subject to PAYE. Employee-level UIF/SDL exclusions remain separate.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e102','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df02','za-2027-r14','2026-03-01','2027-03-01','commission','3606','annual_payment_subject_to_paye','included_remuneration','included_remuneration','PAYE-AE-06-G06 rev 14; PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/paye-ae-06-g06-guide-for-codes-applicable-to-employees-tax-certificates-2027-external-guide/','3606 commission, subject to PAYE; still metadata-only in Shiftly Phase 2.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e103','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df03','za-2027-r14','2026-03-01','2027-03-01','annual_payment_bonus','3605','annual_payment_subject_to_paye','included_remuneration','included_remuneration','PAYE-AE-06-G06 rev 14; PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/paye-ae-06-g06-guide-for-codes-applicable-to-employees-tax-certificates-2027-external-guide/','3605 annual/incentive bonus. This documents the fixed Bonus item without migrating it.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e104','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df04','za-2027-r14','2026-03-01','2027-03-01','overtime','3607','subject_to_paye','included_remuneration','included_remuneration','PAYE-AE-06-G06 rev 14; PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/paye-ae-06-g06-guide-for-codes-applicable-to-employees-tax-certificates-2027-external-guide/','3607 overtime, subject to PAYE. This documents fixed overtime items without migrating them.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e105','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df05','za-2027-r14','2026-03-01','2027-03-01','paid_leave_taken','3601','subject_to_paye','included_remuneration','included_remuneration','PAYE-AE-06-G06 rev 14; PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/paye-ae-06-g06-guide-for-codes-applicable-to-employees-tax-certificates-2027-external-guide/','Only ordinary paid leave taken is mapped to 3601. Leave encashment/resignation is a distinct 3605 annual payment and is not inferred from this fixed item.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e106','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df06','za-2027-r14','2026-03-01','2027-03-01','legacy_generic_allowance',null,'unresolved','unresolved','unresolved','PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Generic Allowance is intentionally unresolved: SARS allowance categories have materially different treatments.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e107','3f4c6f32-4486-4bb5-b437-6573d388b01a','za-2027-r14','2026-03-01','2027-03-01','travel_allowance','3701','requires_context','requires_context','requires_context','PAYE-AE-06-G06 rev 14; PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/paye-ae-06-g06-guide-for-codes-applicable-to-employees-tax-certificates-2027-external-guide/','3701 stores 100% paid. PAYE inclusion is 80%, or 20% where the employer is satisfied at least 80% use will be business; Shiftly does not yet capture that context.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e108','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df07','za-2027-r14','2026-03-01','2027-03-01','local_subsistence_above_deemed_limit','3704','requires_context','unresolved','unresolved','PAYE-AE-06-G06 rev 14; PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/paye-ae-06-g06-guide-for-codes-applicable-to-employees-tax-certificates-2027-external-guide/','3704 is local subsistence exceeding deemed amounts. Per-day/context rules are not implemented, so all calculation treatments remain inactive.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e109','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df08','za-2027-r14','2026-03-01','2027-03-01','employee_pension_fund_contribution','4001','allowable_deduction','does_not_reduce_remuneration','allowable_deduction','PAYE-AE-06-G06 rev 14; PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/paye-ae-06-g06-guide-for-codes-applicable-to-employees-tax-certificates-2027-external-guide/','4001 employee pension fund contribution; allowable deduction for PAYE and SDL balance of remuneration.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e10a','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df09','za-2027-r14','2026-03-01','2027-03-01','employee_provident_fund_contribution','4003','allowable_deduction','does_not_reduce_remuneration','allowable_deduction','PAYE-AE-06-G06 rev 14; PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/paye-ae-06-g06-guide-for-codes-applicable-to-employees-tax-certificates-2027-external-guide/','4003 employee provident fund contribution; structured identity supplements but does not remove legacy name-based Provident compatibility.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e10b','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df0a','za-2027-r14','2026-03-01','2027-03-01','employee_retirement_annuity_fund_contribution','4006','allowable_deduction','does_not_reduce_remuneration','allowable_deduction','PAYE-AE-06-G06 rev 14; PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/paye-ae-06-g06-guide-for-codes-applicable-to-employees-tax-certificates-2027-external-guide/','4006 employee retirement annuity fund contribution; allowable deduction for PAYE and SDL balance of remuneration.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e10c','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df0b','za-2027-r14','2026-03-01','2027-03-01','qualifying_section_18a_donation','4030','allowable_deduction','does_not_reduce_remuneration','allowable_deduction','PAYE-AE-06-G06 rev 14; PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/paye-ae-06-g06-guide-for-codes-applicable-to-employees-tax-certificates-2027-external-guide/','4030 qualifying donation paid by the employer for the employee; statutory limits/receipt requirements are not calculated in Phase 2.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e10d','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df0c','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Tools/PPE is a net-pay deduction only; it is not classified as a statutory allowable deduction.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e10e','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df0d','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Fine is a net-pay deduction only; it is not classified as a statutory allowable deduction.'),
  ('1c2e709a-7016-4c51-9c5d-3ced6cd2e10f','0b1d6f89-6f15-4b40-8b4c-2bdc5bc1df0e','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','PAYE-GEN-01-G21 rev 1','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Loan repayment is a net-pay deduction only; it is not classified as a statutory allowable deduction.');

alter table public.payroll_adjustments
  add column payroll_item_classification_id uuid references public.payroll_item_classifications(id);
alter table public.payroll_deductions
  add column payroll_item_classification_id uuid references public.payroll_item_classifications(id);

alter table public.payroll_adjustments add constraint payroll_adjustments_classification_identity_check check (
  payroll_item_classification_id is null or payroll_item_definition_id is not null
);
alter table public.payroll_deductions add constraint payroll_deductions_classification_identity_check check (
  payroll_item_classification_id is null or payroll_item_definition_id is not null
);

-- Resolve the effective statutory version on the server. The browser never supplies or
-- mutates statutory meaning. Existing Phase 1 rows remain null and are not backfilled.
create or replace function public.payroll_validate_dynamic_item() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  expected_type text;
  definition public.payroll_item_definitions;
  classification public.payroll_item_classifications;
begin
  if new.payroll_item_definition_id is null then
    new.payroll_item_classification_id:=null;
    return new;
  end if;

  expected_type:=case when tg_table_name='payroll_adjustments' then 'adjustment' else 'deduction' end;
  select * into definition from public.payroll_item_definitions d
    where d.id=new.payroll_item_definition_id and d.active;
  if definition.id is null or definition.item_type<>expected_type then
    raise exception 'Invalid or unsupported dynamic payroll item';
  end if;

  select * into classification from public.payroll_item_classifications c
    where c.payroll_item_definition_id=definition.id
      and c.active
      and new.period_end>=c.effective_from
      and new.period_end<c.effective_to;
  if classification.id is null or classification.calculation_status<>'metadata_only' then
    raise exception 'No supported payroll item classification for this period';
  end if;

  new.payroll_item_classification_id:=classification.id;
  new.description:=definition.display_name;
  if expected_type='adjustment' then new.adjustment_type:='dynamic'; new.hours:=0; end if;
  if expected_type='deduction' then new.deduction_type_id:=null; end if;
  return new;
end $$;

drop trigger if exists validate_dynamic_payroll_adjustment on public.payroll_adjustments;
create trigger validate_dynamic_payroll_adjustment
before insert or update of payroll_item_definition_id,payroll_item_classification_id,description,adjustment_type,hours
on public.payroll_adjustments for each row execute function public.payroll_validate_dynamic_item();

drop trigger if exists validate_dynamic_payroll_deduction on public.payroll_deductions;
create trigger validate_dynamic_payroll_deduction
before insert or update of payroll_item_definition_id,payroll_item_classification_id,description,deduction_type_id
on public.payroll_deductions for each row execute function public.payroll_validate_dynamic_item();

commit;
