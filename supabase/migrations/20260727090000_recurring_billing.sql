-- Additive recurring billing support.
-- Existing quotes, invoices, invoice lines, and payments are not modified or deleted.

create extension if not exists pg_cron;

create table if not exists public.billing_recurring_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  company_name text not null,
  template_name text not null,
  client_id uuid references public.billing_clients(id) on delete set null,
  client_name text not null,
  issue_day integer not null default 1 check (issue_day between 1 and 31),
  due_days integer not null default 30 check (due_days between 0 and 365),
  start_date date not null,
  end_date date,
  next_run_date date not null,
  notes text,
  active boolean not null default true,
  last_generated_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_recurring_dates_check check (end_date is null or end_date >= start_date)
);

create table if not exists public.billing_recurring_invoice_items (
  id uuid primary key default gen_random_uuid(),
  recurring_invoice_id uuid not null references public.billing_recurring_invoices(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  company_name text not null,
  item_id uuid references public.billing_items(id) on delete set null,
  item_code text,
  description text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit text not null default 'item',
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  vat_type text not null default 'standard'
    check (vat_type in ('standard', 'zero', 'exempt')),
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.billing_recurring_runs (
  id bigint generated always as identity primary key,
  recurring_invoice_id uuid references public.billing_recurring_invoices(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  scheduled_for date not null,
  status text not null check (status in ('success', 'skipped', 'failed')),
  invoice_id uuid references public.billing_invoices(id) on delete set null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.billing_invoices
  add column if not exists recurring_invoice_id uuid
    references public.billing_recurring_invoices(id) on delete set null,
  add column if not exists recurring_period date;

create index if not exists billing_recurring_invoices_company_idx
  on public.billing_recurring_invoices(company_id, active, next_run_date);

create index if not exists billing_recurring_items_profile_idx
  on public.billing_recurring_invoice_items(recurring_invoice_id, sort_order);

create index if not exists billing_recurring_runs_company_idx
  on public.billing_recurring_runs(company_id, created_at desc);

create unique index if not exists billing_invoices_recurring_period_key
  on public.billing_invoices(recurring_invoice_id, recurring_period)
  where recurring_invoice_id is not null and recurring_period is not null;

alter table public.billing_recurring_invoices enable row level security;
alter table public.billing_recurring_invoice_items enable row level security;
alter table public.billing_recurring_runs enable row level security;

drop policy if exists "billing users can manage recurring invoices"
  on public.billing_recurring_invoices;
create policy "billing users can manage recurring invoices"
on public.billing_recurring_invoices for all to authenticated
using (public.can_access_company_billing(company_id))
with check (public.can_access_company_billing(company_id));

drop policy if exists "billing users can manage recurring invoice items"
  on public.billing_recurring_invoice_items;
create policy "billing users can manage recurring invoice items"
on public.billing_recurring_invoice_items for all to authenticated
using (public.can_access_company_billing(company_id))
with check (public.can_access_company_billing(company_id));

drop policy if exists "billing users can view recurring runs"
  on public.billing_recurring_runs;
create policy "billing users can view recurring runs"
on public.billing_recurring_runs for select to authenticated
using (public.can_access_company_billing(company_id));

create or replace function public.billing_recurring_run_date(
  p_month date,
  p_issue_day integer
)
returns date
language sql
immutable
set search_path = public
as $$
  select least(
    date_trunc('month', p_month)::date + (greatest(1, least(31, p_issue_day)) - 1),
    (date_trunc('month', p_month) + interval '1 month - 1 day')::date
  );
$$;

create or replace function public.billing_next_invoice_number(p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next bigint;
  v_text text;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':billing-invoice-number', 0));

  select coalesce(max(substring(invoice_number from '^INV-([0-9]+)$')::bigint), 0) + 1
  into v_next
  from public.billing_invoices
  where company_id = p_company_id
    and invoice_number ~ '^INV-[0-9]+$';

  v_text := v_next::text;
  return 'INV-' || lpad(v_text, greatest(5, length(v_text)), '0');
end;
$$;

create or replace function public.create_recurring_invoice_draft(
  p_recurring_invoice_id uuid,
  p_period date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.billing_recurring_invoices%rowtype;
  v_client public.billing_clients%rowtype;
  v_company_name text;
  v_invoice_id uuid;
  v_existing_id uuid;
  v_period date := date_trunc('month', p_period)::date;
  v_issue_date date;
  v_due_date date;
  v_invoice_number text;
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
  v_vat numeric(12,2);
  v_total numeric(12,2);
begin
  select * into v_profile
  from public.billing_recurring_invoices
  where id = p_recurring_invoice_id
  for update;

  if not found then
    raise exception 'Recurring invoice template not found';
  end if;

  select id into v_existing_id
  from public.billing_invoices
  where recurring_invoice_id = v_profile.id
    and recurring_period = v_period;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  select * into v_client
  from public.billing_clients
  where id = v_profile.client_id
    and company_id = v_profile.company_id
    and active = true;

  if not found then
    raise exception 'The recurring invoice client is missing or inactive';
  end if;

  if not exists (
    select 1
    from public.billing_recurring_invoice_items
    where recurring_invoice_id = v_profile.id
  ) then
    raise exception 'The recurring invoice has no line items';
  end if;

  select name into v_company_name
  from public.companies
  where id = v_profile.company_id;

  v_issue_date := public.billing_recurring_run_date(v_period, v_profile.issue_day);
  v_due_date := v_issue_date + v_profile.due_days;

  select
    round(coalesce(sum(line_subtotal), 0), 2),
    round(coalesce(sum(line_discount), 0), 2),
    round(coalesce(sum(line_vat), 0), 2),
    round(coalesce(sum(line_total), 0), 2)
  into v_subtotal, v_discount, v_vat, v_total
  from (
    select
      round(gross - discount, 2) as line_subtotal,
      round(discount, 2) as line_discount,
      round(case when vat_type = 'standard' then (gross - discount) * 0.15 else 0 end, 2) as line_vat,
      round((gross - discount) +
        case when vat_type = 'standard' then (gross - discount) * 0.15 else 0 end, 2) as line_total
    from (
      select
        quantity * unit_price as gross,
        quantity * unit_price * discount_percent / 100 as discount,
        vat_type
      from public.billing_recurring_invoice_items
      where recurring_invoice_id = v_profile.id
    ) amounts
  ) totals;

  v_invoice_number := public.billing_next_invoice_number(v_profile.company_id);

  insert into public.billing_invoices (
    company_id, company_name, invoice_number, quote_id,
    client_id, client_name, client_contact, client_email, client_phone,
    client_address, client_vat_number, status, issue_date, due_date,
    subtotal, discount_total, vat_total, total, paid_total, balance_due,
    notes, recurring_invoice_id, recurring_period, updated_at
  ) values (
    v_profile.company_id, coalesce(v_company_name, v_profile.company_name),
    v_invoice_number, null,
    v_client.id, v_client.name, v_client.contact_person, v_client.email,
    v_client.phone, v_client.address, v_client.vat_number,
    'draft', v_issue_date, v_due_date,
    v_subtotal, v_discount, v_vat, v_total, 0, v_total,
    v_profile.notes, v_profile.id, v_period, now()
  )
  returning id into v_invoice_id;

  insert into public.billing_invoice_items (
    invoice_id, company_id, company_name, item_id, item_code, description,
    quantity, unit, unit_price, discount_percent, vat_type,
    line_subtotal, line_vat, line_total, sort_order
  )
  select
    v_invoice_id, item.company_id, item.company_name, item.item_id,
    item.item_code, item.description, item.quantity, item.unit,
    item.unit_price, item.discount_percent, item.vat_type,
    round(amounts.gross - amounts.discount, 2),
    round(case when item.vat_type = 'standard'
      then (amounts.gross - amounts.discount) * 0.15 else 0 end, 2),
    round((amounts.gross - amounts.discount) +
      case when item.vat_type = 'standard'
        then (amounts.gross - amounts.discount) * 0.15 else 0 end, 2),
    item.sort_order
  from public.billing_recurring_invoice_items item
  cross join lateral (
    select
      item.quantity * item.unit_price as gross,
      item.quantity * item.unit_price * item.discount_percent / 100 as discount
  ) amounts
  where item.recurring_invoice_id = v_profile.id
  order by item.sort_order, item.created_at;

  return v_invoice_id;
end;
$$;

create or replace function public.save_billing_recurring_invoice(
  p_id uuid,
  p_company_id uuid,
  p_template_name text,
  p_client_id uuid,
  p_issue_day integer,
  p_due_days integer,
  p_start_date date,
  p_end_date date,
  p_next_run_date date,
  p_notes text,
  p_active boolean,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_company_name text;
  v_client_name text;
begin
  if not public.can_access_company_billing(p_company_id) then
    raise exception 'Billing access required';
  end if;

  if nullif(trim(p_template_name), '') is null then
    raise exception 'Template name is required';
  end if;
  if p_issue_day not between 1 and 31 then
    raise exception 'Invoice day must be between 1 and 31';
  end if;
  if p_due_days not between 0 and 365 then
    raise exception 'Payment terms must be between 0 and 365 days';
  end if;
  if p_start_date is null or p_next_run_date is null then
    raise exception 'Start date and next invoice date are required';
  end if;
  if p_next_run_date < p_start_date then
    raise exception 'Next invoice date cannot be before the start date';
  end if;
  if p_end_date is not null and p_end_date < p_start_date then
    raise exception 'End date cannot be before start date';
  end if;
  if p_end_date is not null and p_end_date < p_next_run_date then
    raise exception 'End date cannot be before the next invoice date';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one recurring line item';
  end if;

  select name into v_company_name from public.companies where id = p_company_id;
  select name into v_client_name
  from public.billing_clients
  where id = p_client_id and company_id = p_company_id and active = true;

  if v_company_name is null then
    raise exception 'Company not found';
  end if;
  if v_client_name is null then
    raise exception 'Select an active billing client';
  end if;

  if p_id is null then
    insert into public.billing_recurring_invoices (
      company_id, company_name, template_name, client_id, client_name,
      issue_day, due_days, start_date, end_date, next_run_date,
      notes, active, updated_at
    ) values (
      p_company_id, v_company_name, trim(p_template_name), p_client_id,
      v_client_name, p_issue_day, p_due_days, p_start_date, p_end_date,
      p_next_run_date, nullif(trim(coalesce(p_notes, '')), ''), p_active, now()
    )
    returning id into v_id;
  else
    update public.billing_recurring_invoices
    set template_name = trim(p_template_name),
        client_id = p_client_id,
        client_name = v_client_name,
        issue_day = p_issue_day,
        due_days = p_due_days,
        start_date = p_start_date,
        end_date = p_end_date,
        next_run_date = p_next_run_date,
        notes = nullif(trim(coalesce(p_notes, '')), ''),
        active = p_active,
        updated_at = now()
    where id = p_id and company_id = p_company_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Recurring invoice template not found';
    end if;

    delete from public.billing_recurring_invoice_items
    where recurring_invoice_id = v_id and company_id = p_company_id;
  end if;

  insert into public.billing_recurring_invoice_items (
    recurring_invoice_id, company_id, company_name, item_id, item_code,
    description, quantity, unit, unit_price, discount_percent, vat_type,
    sort_order
  )
  select
    v_id, p_company_id, v_company_name, item.item_id, item.item_code,
    item.description, item.quantity, coalesce(nullif(item.unit, ''), 'item'),
    item.unit_price, item.discount_percent, item.vat_type, item.sort_order
  from jsonb_to_recordset(p_items) as item(
    item_id uuid,
    item_code text,
    description text,
    quantity numeric,
    unit text,
    unit_price numeric,
    discount_percent numeric,
    vat_type text,
    sort_order integer
  );

  if exists (
    select 1
    from public.billing_recurring_invoice_items recurring_item
    where recurring_item.recurring_invoice_id = v_id
      and recurring_item.item_id is not null
      and not exists (
        select 1
        from public.billing_items billing_item
        where billing_item.id = recurring_item.item_id
          and billing_item.company_id = p_company_id
      )
  ) then
    raise exception 'A recurring line item does not belong to this company';
  end if;

  return v_id;
end;
$$;

create or replace function public.generate_due_billing_invoices(
  p_run_date date default ((now() at time zone 'Africa/Johannesburg')::date)
)
returns table(created_count integer, skipped_count integer, failed_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.billing_recurring_invoices%rowtype;
  v_invoice_id uuid;
  v_period date;
  v_created integer := 0;
  v_skipped integer := 0;
  v_failed integer := 0;
begin
  for v_profile in
    select *
    from public.billing_recurring_invoices
    where active = true
      and next_run_date <= p_run_date
      and start_date <= p_run_date
      and (end_date is null or next_run_date <= end_date)
    order by next_run_date, created_at
    for update skip locked
  loop
    begin
      v_period := date_trunc('month', v_profile.next_run_date)::date;

      if exists (
        select 1 from public.billing_invoices
        where recurring_invoice_id = v_profile.id
          and recurring_period = v_period
      ) then
        update public.billing_recurring_invoices
        set next_run_date = public.billing_recurring_run_date((v_period + interval '1 month')::date, issue_day),
            updated_at = now()
        where id = v_profile.id;

        insert into public.billing_recurring_runs (
          recurring_invoice_id, company_id, scheduled_for, status, message
        ) values (
          v_profile.id, v_profile.company_id, v_profile.next_run_date,
          'skipped', 'Draft already exists for this billing month'
        );
        v_skipped := v_skipped + 1;
      else
        v_invoice_id := public.create_recurring_invoice_draft(v_profile.id, v_period);

        update public.billing_recurring_invoices
        set next_run_date = public.billing_recurring_run_date((v_period + interval '1 month')::date, issue_day),
            last_generated_at = now(),
            updated_at = now()
        where id = v_profile.id;

        insert into public.billing_recurring_runs (
          recurring_invoice_id, company_id, scheduled_for, status,
          invoice_id, message
        ) values (
          v_profile.id, v_profile.company_id, v_profile.next_run_date,
          'success', v_invoice_id, 'Draft invoice created'
        );
        v_created := v_created + 1;
      end if;
    exception when others then
      insert into public.billing_recurring_runs (
        recurring_invoice_id, company_id, scheduled_for, status, message
      ) values (
        v_profile.id, v_profile.company_id, v_profile.next_run_date,
        'failed', left(sqlerrm, 500)
      );
      v_failed := v_failed + 1;
    end;
  end loop;

  return query select v_created, v_skipped, v_failed;
end;
$$;

create or replace function public.generate_billing_recurring_draft_now(
  p_recurring_invoice_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.billing_recurring_invoices%rowtype;
  v_period date := date_trunc('month', (now() at time zone 'Africa/Johannesburg')::date)::date;
  v_invoice_id uuid;
begin
  select * into v_profile
  from public.billing_recurring_invoices
  where id = p_recurring_invoice_id;

  if not found or not public.can_access_company_billing(v_profile.company_id) then
    raise exception 'Recurring invoice template not found';
  end if;

  v_invoice_id := public.create_recurring_invoice_draft(v_profile.id, v_period);

  insert into public.billing_recurring_runs (
    recurring_invoice_id, company_id, scheduled_for, status, invoice_id, message
  ) values (
    v_profile.id, v_profile.company_id,
    (now() at time zone 'Africa/Johannesburg')::date,
    'success', v_invoice_id, 'Draft generated manually'
  );

  return v_invoice_id;
end;
$$;

revoke all on function public.billing_next_invoice_number(uuid) from public, anon, authenticated;
revoke all on function public.create_recurring_invoice_draft(uuid, date) from public, anon, authenticated;
revoke all on function public.generate_due_billing_invoices(date) from public, anon, authenticated;
revoke all on function public.save_billing_recurring_invoice(
  uuid, uuid, text, uuid, integer, integer, date, date, date, text, boolean, jsonb
) from public, anon;
revoke all on function public.generate_billing_recurring_draft_now(uuid) from public, anon;

grant execute on function public.save_billing_recurring_invoice(
  uuid, uuid, text, uuid, integer, integer, date, date, date, text, boolean, jsonb
) to authenticated;
grant execute on function public.generate_billing_recurring_draft_now(uuid) to authenticated;

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'shiftly-generate-recurring-invoices';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'shiftly-generate-recurring-invoices',
    '15 22 * * *',
    'select public.generate_due_billing_invoices();'
  );
end;
$$;
