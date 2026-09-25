-- Complete the safely supported ordinary employee-deduction catalogue.
--
-- These items are employee-authorised net-pay deductions only. They do not reduce
-- PAYE remuneration, UIF remuneration or SDL leviable remuneration, and they do
-- not carry SARS source codes. Existing definitions/classifications and all
-- historical payroll rows remain untouched.
--
-- Statutory classification basis (2027 year of assessment):
--   PAYE-GEN-01-G21 revision 1, Guide for Employers in Respect of Employees' Tax 2027
--   PAYE-AE-06-G06 revision 14, effective 18 September 2026
-- PAYE-GEN-01-G21 identifies the statutory deductions that reduce the PAYE/SDL
-- balance of remuneration. These ordinary deductions are deliberately not treated
-- as any of those statutory deductions.
begin;

insert into public.payroll_item_definitions
  (id,item_key,display_name,item_type,classification_status,selector_visible)
values
  ('4d7a9c10-5f21-4a8e-9000-000000000001','salary_advance_repayment','Salary Advance Repayment','deduction','authoritative',true),
  ('4d7a9c10-5f21-4a8e-9000-000000000002','emoluments_attachment_order','Garnishee / Emoluments Attachment Order','deduction','authoritative',true),
  ('4d7a9c10-5f21-4a8e-9000-000000000003','maintenance_order','Maintenance Order','deduction','authoritative',true),
  ('4d7a9c10-5f21-4a8e-9000-000000000004','union_subscription','Union Subscription','deduction','authoritative',true),
  ('4d7a9c10-5f21-4a8e-9000-000000000005','bargaining_council_employee_contribution','Bargaining Council Employee Contribution','deduction','authoritative',true),
  ('4d7a9c10-5f21-4a8e-9000-000000000006','funeral_scheme_contribution','Funeral Scheme Contribution','deduction','authoritative',true),
  ('4d7a9c10-5f21-4a8e-9000-000000000007','group_insurance_premium','Group Insurance Premium','deduction','authoritative',true),
  ('4d7a9c10-5f21-4a8e-9000-000000000008','staff_purchase','Staff Purchase','deduction','authoritative',true),
  ('4d7a9c10-5f21-4a8e-9000-000000000009','accommodation_deduction','Accommodation Deduction','deduction','authoritative',true),
  ('4d7a9c10-5f21-4a8e-9000-00000000000a','meals_deduction','Meals Deduction','deduction','authoritative',true),
  ('4d7a9c10-5f21-4a8e-9000-00000000000b','transport_deduction','Transport Deduction','deduction','authoritative',true),
  ('4d7a9c10-5f21-4a8e-9000-00000000000c','other_authorised_deduction','Other Authorised Deduction','deduction','authoritative',true)
on conflict do nothing;

do $$
declare matched integer;
begin
  select count(*) into matched
  from public.payroll_item_definitions d
  join (values
    ('4d7a9c10-5f21-4a8e-9000-000000000001'::uuid,'salary_advance_repayment','Salary Advance Repayment'),
    ('4d7a9c10-5f21-4a8e-9000-000000000002'::uuid,'emoluments_attachment_order','Garnishee / Emoluments Attachment Order'),
    ('4d7a9c10-5f21-4a8e-9000-000000000003'::uuid,'maintenance_order','Maintenance Order'),
    ('4d7a9c10-5f21-4a8e-9000-000000000004'::uuid,'union_subscription','Union Subscription'),
    ('4d7a9c10-5f21-4a8e-9000-000000000005'::uuid,'bargaining_council_employee_contribution','Bargaining Council Employee Contribution'),
    ('4d7a9c10-5f21-4a8e-9000-000000000006'::uuid,'funeral_scheme_contribution','Funeral Scheme Contribution'),
    ('4d7a9c10-5f21-4a8e-9000-000000000007'::uuid,'group_insurance_premium','Group Insurance Premium'),
    ('4d7a9c10-5f21-4a8e-9000-000000000008'::uuid,'staff_purchase','Staff Purchase'),
    ('4d7a9c10-5f21-4a8e-9000-000000000009'::uuid,'accommodation_deduction','Accommodation Deduction'),
    ('4d7a9c10-5f21-4a8e-9000-00000000000a'::uuid,'meals_deduction','Meals Deduction'),
    ('4d7a9c10-5f21-4a8e-9000-00000000000b'::uuid,'transport_deduction','Transport Deduction'),
    ('4d7a9c10-5f21-4a8e-9000-00000000000c'::uuid,'other_authorised_deduction','Other Authorised Deduction')
  ) expected(id,item_key,display_name)
    on d.id=expected.id and d.item_key=expected.item_key and d.display_name=expected.display_name
  where d.item_type='deduction' and d.classification_status='authoritative'
    and d.selector_visible and d.active;
  if matched<>12 then
    raise exception 'Payroll deduction catalogue definition conflict';
  end if;
end $$;

insert into public.payroll_item_classifications
  (id,payroll_item_definition_id,classification_version,effective_from,effective_to,
   statutory_category,sars_source_code,paye_treatment,uif_treatment,sdl_treatment,
   calculation_status,authority_document,authority_url,authority_note)
values
  ('5e8b0d20-6a32-4b9f-a000-000000000001','4d7a9c10-5f21-4a8e-9000-000000000001','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Salary advance repayment; ordinary net-pay deduction with no SARS source code.'),
  ('5e8b0d20-6a32-4b9f-a000-000000000002','4d7a9c10-5f21-4a8e-9000-000000000002','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Emoluments attachment order; ordinary net-pay deduction with no SARS source code. Shiftly does not determine legal priority or protected amounts.'),
  ('5e8b0d20-6a32-4b9f-a000-000000000003','4d7a9c10-5f21-4a8e-9000-000000000003','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Maintenance order; ordinary net-pay deduction with no SARS source code. Shiftly does not determine legal priority or protected amounts.'),
  ('5e8b0d20-6a32-4b9f-a000-000000000004','4d7a9c10-5f21-4a8e-9000-000000000004','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Union subscription; ordinary net-pay deduction with no SARS source code.'),
  ('5e8b0d20-6a32-4b9f-a000-000000000005','4d7a9c10-5f21-4a8e-9000-000000000005','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Employee bargaining-council contribution; ordinary net-pay deduction with no SARS source code.'),
  ('5e8b0d20-6a32-4b9f-a000-000000000006','4d7a9c10-5f21-4a8e-9000-000000000006','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Funeral scheme contribution; ordinary net-pay deduction with no SARS source code.'),
  ('5e8b0d20-6a32-4b9f-a000-000000000007','4d7a9c10-5f21-4a8e-9000-000000000007','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Group insurance premium; ordinary net-pay deduction with no SARS source code. Employer-paid taxable benefits require separate support.'),
  ('5e8b0d20-6a32-4b9f-a000-000000000008','4d7a9c10-5f21-4a8e-9000-000000000008','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Staff purchase repayment; ordinary net-pay deduction with no SARS source code.'),
  ('5e8b0d20-6a32-4b9f-a000-000000000009','4d7a9c10-5f21-4a8e-9000-000000000009','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Employee accommodation charge; ordinary net-pay deduction with no SARS source code. Employer-provided accommodation benefits require separate support.'),
  ('5e8b0d20-6a32-4b9f-a000-00000000000a','4d7a9c10-5f21-4a8e-9000-00000000000a','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Employee meal charge; ordinary net-pay deduction with no SARS source code. Employer-provided meal benefits require separate support.'),
  ('5e8b0d20-6a32-4b9f-a000-00000000000b','4d7a9c10-5f21-4a8e-9000-00000000000b','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Employee transport charge; ordinary net-pay deduction with no SARS source code. Travel allowances and employer-provided transport benefits require separate support.'),
  ('5e8b0d20-6a32-4b9f-a000-00000000000c','4d7a9c10-5f21-4a8e-9000-00000000000c','za-2027-r14','2026-03-01','2027-03-01','ordinary_business_deduction',null,'not_applicable_net_deduction','not_applicable_net_deduction','not_applicable_net_deduction','payroll_active','PAYE-GEN-01-G21 rev 1; PAYE-AE-06-G06 rev 14','https://www.sars.gov.za/guide-for-employers-in-respect-of-employees-tax-2027/','Other employer-authorised net-pay deduction; no SARS source code and no statutory deduction treatment.')
on conflict do nothing;

do $$
declare matched integer;
begin
  select count(*) into matched
  from public.payroll_item_classifications c
  join (values
    ('5e8b0d20-6a32-4b9f-a000-000000000001'::uuid,'4d7a9c10-5f21-4a8e-9000-000000000001'::uuid),
    ('5e8b0d20-6a32-4b9f-a000-000000000002'::uuid,'4d7a9c10-5f21-4a8e-9000-000000000002'::uuid),
    ('5e8b0d20-6a32-4b9f-a000-000000000003'::uuid,'4d7a9c10-5f21-4a8e-9000-000000000003'::uuid),
    ('5e8b0d20-6a32-4b9f-a000-000000000004'::uuid,'4d7a9c10-5f21-4a8e-9000-000000000004'::uuid),
    ('5e8b0d20-6a32-4b9f-a000-000000000005'::uuid,'4d7a9c10-5f21-4a8e-9000-000000000005'::uuid),
    ('5e8b0d20-6a32-4b9f-a000-000000000006'::uuid,'4d7a9c10-5f21-4a8e-9000-000000000006'::uuid),
    ('5e8b0d20-6a32-4b9f-a000-000000000007'::uuid,'4d7a9c10-5f21-4a8e-9000-000000000007'::uuid),
    ('5e8b0d20-6a32-4b9f-a000-000000000008'::uuid,'4d7a9c10-5f21-4a8e-9000-000000000008'::uuid),
    ('5e8b0d20-6a32-4b9f-a000-000000000009'::uuid,'4d7a9c10-5f21-4a8e-9000-000000000009'::uuid),
    ('5e8b0d20-6a32-4b9f-a000-00000000000a'::uuid,'4d7a9c10-5f21-4a8e-9000-00000000000a'::uuid),
    ('5e8b0d20-6a32-4b9f-a000-00000000000b'::uuid,'4d7a9c10-5f21-4a8e-9000-00000000000b'::uuid),
    ('5e8b0d20-6a32-4b9f-a000-00000000000c'::uuid,'4d7a9c10-5f21-4a8e-9000-00000000000c'::uuid)
  ) expected(id,definition_id)
    on c.id=expected.id and c.payroll_item_definition_id=expected.definition_id
  where c.classification_version='za-2027-r14'
    and c.effective_from='2026-03-01' and c.effective_to='2027-03-01'
    and c.statutory_category='ordinary_business_deduction'
    and c.sars_source_code is null
    and c.paye_treatment='not_applicable_net_deduction'
    and c.uif_treatment='not_applicable_net_deduction'
    and c.sdl_treatment='not_applicable_net_deduction'
    and c.calculation_status='payroll_active' and c.active;
  if matched<>12 then
    raise exception 'Payroll deduction catalogue classification conflict';
  end if;
end $$;

commit;
