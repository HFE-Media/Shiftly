-- Shiftly Billing documents.
-- Run after database/billing-foundation.sql.
-- Adds company-scoped quotes, quote lines, invoices, invoice lines, and payments.

create table if not exists public.billing_quotes (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  company_name text not null,
  quote_number text not null,
  client_id uuid null,
  client_name text not null,
  client_contact text null,
  client_email text null,
  client_phone text null,
  client_address text null,
  client_vat_number text null,
  status text not null default 'draft',
  issue_date date not null default current_date,
  expiry_date date null,
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  vat_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint billing_quotes_pkey primary key (id),
  constraint billing_quotes_company_id_fkey foreign key (company_id) references public.companies (id) on delete cascade,
  constraint billing_quotes_client_id_fkey foreign key (client_id) references public.billing_clients (id) on delete set null,
  constraint billing_quotes_status_check check (status = any (array['draft'::text, 'sent'::text, 'accepted'::text, 'declined'::text, 'expired'::text]))
) tablespace pg_default;

create table if not exists public.billing_quote_items (
  id uuid not null default gen_random_uuid(),
  quote_id uuid not null,
  company_id uuid not null,
  company_name text not null,
  item_id uuid null,
  item_code text null,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit text not null default 'item',
  unit_price numeric(12, 2) not null default 0,
  discount_percent numeric(5, 2) not null default 0,
  vat_type text not null default 'standard',
  line_subtotal numeric(12, 2) not null default 0,
  line_vat numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  sort_order integer not null default 1,
  created_at timestamp with time zone not null default now(),
  constraint billing_quote_items_pkey primary key (id),
  constraint billing_quote_items_quote_id_fkey foreign key (quote_id) references public.billing_quotes (id) on delete cascade,
  constraint billing_quote_items_company_id_fkey foreign key (company_id) references public.companies (id) on delete cascade,
  constraint billing_quote_items_item_id_fkey foreign key (item_id) references public.billing_items (id) on delete set null,
  constraint billing_quote_items_vat_type_check check (vat_type = any (array['standard'::text, 'zero'::text, 'exempt'::text]))
) tablespace pg_default;

create table if not exists public.billing_invoices (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  company_name text not null,
  invoice_number text not null,
  quote_id uuid null,
  client_id uuid null,
  client_name text not null,
  client_contact text null,
  client_email text null,
  client_phone text null,
  client_address text null,
  client_vat_number text null,
  status text not null default 'draft',
  issue_date date not null default current_date,
  due_date date null,
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  vat_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  paid_total numeric(12, 2) not null default 0,
  balance_due numeric(12, 2) not null default 0,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint billing_invoices_pkey primary key (id),
  constraint billing_invoices_company_id_fkey foreign key (company_id) references public.companies (id) on delete cascade,
  constraint billing_invoices_quote_id_fkey foreign key (quote_id) references public.billing_quotes (id) on delete set null,
  constraint billing_invoices_client_id_fkey foreign key (client_id) references public.billing_clients (id) on delete set null,
  constraint billing_invoices_status_check check (status = any (array['draft'::text, 'sent'::text, 'partially_paid'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text]))
) tablespace pg_default;

alter table public.billing_quotes
  add column if not exists client_contact text null,
  add column if not exists client_email text null,
  add column if not exists client_phone text null,
  add column if not exists client_address text null,
  add column if not exists client_vat_number text null;

alter table public.billing_invoices
  add column if not exists client_contact text null,
  add column if not exists client_email text null,
  add column if not exists client_phone text null,
  add column if not exists client_address text null,
  add column if not exists client_vat_number text null;

create table if not exists public.billing_invoice_items (
  id uuid not null default gen_random_uuid(),
  invoice_id uuid not null,
  company_id uuid not null,
  company_name text not null,
  item_id uuid null,
  item_code text null,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit text not null default 'item',
  unit_price numeric(12, 2) not null default 0,
  discount_percent numeric(5, 2) not null default 0,
  vat_type text not null default 'standard',
  line_subtotal numeric(12, 2) not null default 0,
  line_vat numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  sort_order integer not null default 1,
  created_at timestamp with time zone not null default now(),
  constraint billing_invoice_items_pkey primary key (id),
  constraint billing_invoice_items_invoice_id_fkey foreign key (invoice_id) references public.billing_invoices (id) on delete cascade,
  constraint billing_invoice_items_company_id_fkey foreign key (company_id) references public.companies (id) on delete cascade,
  constraint billing_invoice_items_item_id_fkey foreign key (item_id) references public.billing_items (id) on delete set null,
  constraint billing_invoice_items_vat_type_check check (vat_type = any (array['standard'::text, 'zero'::text, 'exempt'::text]))
) tablespace pg_default;

create table if not exists public.billing_payments (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  company_name text not null,
  invoice_id uuid not null,
  payment_date date not null default current_date,
  amount numeric(12, 2) not null,
  method text null,
  reference text null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  created_by uuid null,
  constraint billing_payments_pkey primary key (id),
  constraint billing_payments_company_id_fkey foreign key (company_id) references public.companies (id) on delete cascade,
  constraint billing_payments_invoice_id_fkey foreign key (invoice_id) references public.billing_invoices (id) on delete cascade,
  constraint billing_payments_created_by_fkey foreign key (created_by) references auth.users (id),
  constraint billing_payments_amount_check check (amount > 0)
) tablespace pg_default;

create table if not exists public.billing_company_profiles (
  company_id uuid not null,
  company_name text not null,
  registration_number text null,
  vat_number text null,
  email text null,
  phone text null,
  address text null,
  bank_name text null,
  account_name text null,
  account_number text null,
  branch_code text null,
  account_type text null,
  payment_terms_days integer not null default 30,
  default_notes text null,
  updated_at timestamp with time zone not null default now(),
  constraint billing_company_profiles_pkey primary key (company_id),
  constraint billing_company_profiles_company_id_fkey foreign key (company_id) references public.companies (id) on delete cascade,
  constraint billing_company_profiles_payment_terms_check check (payment_terms_days between 0 and 365)
) tablespace pg_default;

create unique index if not exists billing_quotes_company_number_key
on public.billing_quotes using btree (company_id, quote_number) tablespace pg_default;

create unique index if not exists billing_invoices_company_number_key
on public.billing_invoices using btree (company_id, invoice_number) tablespace pg_default;

create unique index if not exists billing_invoices_quote_id_key
on public.billing_invoices using btree (quote_id) where quote_id is not null;

create index if not exists billing_quotes_company_id_idx
on public.billing_quotes using btree (company_id) tablespace pg_default;

create index if not exists billing_quote_items_quote_id_idx
on public.billing_quote_items using btree (quote_id) tablespace pg_default;

create index if not exists billing_invoices_company_id_idx
on public.billing_invoices using btree (company_id) tablespace pg_default;

create index if not exists billing_invoice_items_invoice_id_idx
on public.billing_invoice_items using btree (invoice_id) tablespace pg_default;

create index if not exists billing_payments_invoice_id_idx
on public.billing_payments using btree (invoice_id) tablespace pg_default;

drop trigger if exists set_billing_company_profiles_company_name on public.billing_company_profiles;
create trigger set_billing_company_profiles_company_name
before insert or update of company_id on public.billing_company_profiles
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_billing_quotes_company_name on public.billing_quotes;
create trigger set_billing_quotes_company_name
before insert or update of company_id on public.billing_quotes
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_billing_quote_items_company_name on public.billing_quote_items;
create trigger set_billing_quote_items_company_name
before insert or update of company_id on public.billing_quote_items
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_billing_invoices_company_name on public.billing_invoices;
create trigger set_billing_invoices_company_name
before insert or update of company_id on public.billing_invoices
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_billing_invoice_items_company_name on public.billing_invoice_items;
create trigger set_billing_invoice_items_company_name
before insert or update of company_id on public.billing_invoice_items
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_billing_payments_company_name on public.billing_payments;
create trigger set_billing_payments_company_name
before insert or update of company_id on public.billing_payments
for each row execute function public.set_company_name_from_company_id();

alter table public.billing_quotes enable row level security;
alter table public.billing_quote_items enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_invoice_items enable row level security;
alter table public.billing_payments enable row level security;
alter table public.billing_company_profiles enable row level security;

create or replace function public.refresh_billing_invoice_totals(p_invoice_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_total numeric(12,2);
  v_paid numeric(12,2);
  v_due date;
  v_status text;
begin
  select total, due_date, status into v_total, v_due, v_status
  from public.billing_invoices where id = p_invoice_id;

  if not found then return; end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.billing_payments where invoice_id = p_invoice_id;

  update public.billing_invoices
  set paid_total = v_paid,
      balance_due = greatest(v_total - v_paid, 0),
      status = case
        when v_status = 'cancelled' then 'cancelled'
        when v_paid >= v_total and v_total > 0 then 'paid'
        when v_paid > 0 then 'partially_paid'
        when v_due is not null and v_due < current_date then 'overdue'
        when v_status in ('partially_paid', 'paid', 'overdue') then 'sent'
        else v_status
      end,
      updated_at = now()
  where id = p_invoice_id;
end;
$$;

create or replace function public.billing_payment_changed()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.refresh_billing_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists billing_payments_refresh_invoice on public.billing_payments;
create trigger billing_payments_refresh_invoice
after insert or update or delete on public.billing_payments
for each row execute function public.billing_payment_changed();

create or replace function public.convert_billing_quote_to_invoice(
  p_quote_id uuid,
  p_invoice_number text,
  p_issue_date date,
  p_due_date date
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_quote public.billing_quotes%rowtype;
  v_invoice_id uuid;
begin
  select * into v_quote from public.billing_quotes where id = p_quote_id;
  if not found then raise exception 'Quote not found'; end if;
  if v_quote.status <> 'accepted' then raise exception 'Only accepted quotes can be converted'; end if;
  if exists (select 1 from public.billing_invoices where quote_id = p_quote_id) then
    raise exception 'This quote has already been converted';
  end if;

  insert into public.billing_invoices (
    company_id, company_name, invoice_number, quote_id, client_id, client_name,
    client_contact, client_email, client_phone, client_address, client_vat_number,
    status, issue_date, due_date, subtotal, discount_total, vat_total, total,
    paid_total, balance_due, notes
  ) values (
    v_quote.company_id, v_quote.company_name, p_invoice_number, v_quote.id,
    v_quote.client_id, v_quote.client_name, v_quote.client_contact, v_quote.client_email,
    v_quote.client_phone, v_quote.client_address, v_quote.client_vat_number,
    'draft', p_issue_date, p_due_date,
    v_quote.subtotal, v_quote.discount_total, v_quote.vat_total, v_quote.total,
    0, v_quote.total, v_quote.notes
  ) returning id into v_invoice_id;

  insert into public.billing_invoice_items (
    invoice_id, company_id, company_name, item_id, item_code, description,
    quantity, unit, unit_price, discount_percent, vat_type, line_subtotal,
    line_vat, line_total, sort_order
  )
  select v_invoice_id, company_id, company_name, item_id, item_code, description,
    quantity, unit, unit_price, discount_percent, vat_type, line_subtotal,
    line_vat, line_total, sort_order
  from public.billing_quote_items where quote_id = p_quote_id;

  return v_invoice_id;
end;
$$;

drop policy if exists "members can view billing quotes" on public.billing_quotes;
create policy "members can view billing quotes"
on public.billing_quotes for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_quotes.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "billing users can manage quotes" on public.billing_quotes;
create policy "billing users can manage quotes"
on public.billing_quotes for all to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_quotes.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
)
with check (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_quotes.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
);

drop policy if exists "members can view billing quote items" on public.billing_quote_items;
create policy "members can view billing quote items"
on public.billing_quote_items for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_quote_items.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "billing users can manage quote items" on public.billing_quote_items;
create policy "billing users can manage quote items"
on public.billing_quote_items for all to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_quote_items.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
)
with check (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_quote_items.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
);

drop policy if exists "members can view billing invoices" on public.billing_invoices;
create policy "members can view billing invoices"
on public.billing_invoices for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_invoices.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "billing users can manage invoices" on public.billing_invoices;
create policy "billing users can manage invoices"
on public.billing_invoices for all to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_invoices.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
)
with check (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_invoices.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
);

drop policy if exists "members can view billing invoice items" on public.billing_invoice_items;
create policy "members can view billing invoice items"
on public.billing_invoice_items for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_invoice_items.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "billing users can manage invoice items" on public.billing_invoice_items;
create policy "billing users can manage invoice items"
on public.billing_invoice_items for all to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_invoice_items.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
)
with check (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_invoice_items.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
);

drop policy if exists "members can view billing payments" on public.billing_payments;
create policy "members can view billing payments"
on public.billing_payments for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_payments.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "billing users can manage payments" on public.billing_payments;
create policy "billing users can manage payments"
on public.billing_payments for all to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_payments.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
)
with check (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_payments.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
);

drop policy if exists "members can view billing company profiles" on public.billing_company_profiles;
create policy "members can view billing company profiles"
on public.billing_company_profiles for select to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_company_profiles.company_id
      and cu.user_id = auth.uid() and cu.active = true
  )
);

drop policy if exists "billing users can manage company profiles" on public.billing_company_profiles;
create policy "billing users can manage company profiles"
on public.billing_company_profiles for all to authenticated
using (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_company_profiles.company_id
      and cu.user_id = auth.uid() and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
)
with check (
  exists (
    select 1 from public.company_users cu
    where cu.company_id = billing_company_profiles.company_id
      and cu.user_id = auth.uid() and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
);
