-- Shiftly Billing foundation.
-- Adds company-scoped clients and reusable invoice/quote items.

alter table public.company_users
drop constraint if exists company_users_role_check;

alter table public.company_users
add constraint company_users_role_check
check (
  role = any (
    array[
      'owner'::text,
      'admin'::text,
      'billing'::text,
      'supervisor'::text,
      'employee'::text,
      'viewer'::text
    ]
  )
);

create table if not exists public.billing_clients (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  company_name text not null,
  name text not null,
  contact_person text null,
  email text null,
  phone text null,
  address text null,
  vat_number text null,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint billing_clients_pkey primary key (id),
  constraint billing_clients_company_id_fkey foreign key (company_id) references public.companies (id) on delete cascade
) tablespace pg_default;

create table if not exists public.billing_items (
  id uuid not null default gen_random_uuid(),
  company_id uuid not null,
  company_name text not null,
  item_code text not null,
  name text not null,
  description text null,
  unit text not null default 'item',
  price numeric(12, 2) not null default 0,
  vat_type text not null default 'standard',
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint billing_items_pkey primary key (id),
  constraint billing_items_company_id_fkey foreign key (company_id) references public.companies (id) on delete cascade,
  constraint billing_items_vat_type_check check (vat_type = any (array['standard'::text, 'zero'::text, 'exempt'::text]))
) tablespace pg_default;

create unique index if not exists billing_items_company_code_key
on public.billing_items using btree (company_id, item_code) tablespace pg_default;

create index if not exists billing_clients_company_id_idx
on public.billing_clients using btree (company_id) tablespace pg_default;

create index if not exists billing_clients_company_name_idx
on public.billing_clients using btree (company_name) tablespace pg_default;

create index if not exists billing_items_company_id_idx
on public.billing_items using btree (company_id) tablespace pg_default;

create index if not exists billing_items_company_name_idx
on public.billing_items using btree (company_name) tablespace pg_default;

drop trigger if exists set_billing_clients_company_name on public.billing_clients;
create trigger set_billing_clients_company_name
before insert or update of company_id on public.billing_clients
for each row execute function public.set_company_name_from_company_id();

drop trigger if exists set_billing_items_company_name on public.billing_items;
create trigger set_billing_items_company_name
before insert or update of company_id on public.billing_items
for each row execute function public.set_company_name_from_company_id();

alter table public.billing_clients enable row level security;
alter table public.billing_items enable row level security;

drop policy if exists "members can view billing clients" on public.billing_clients;
create policy "members can view billing clients"
on public.billing_clients for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = billing_clients.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "billing users can manage clients" on public.billing_clients;
create policy "billing users can manage clients"
on public.billing_clients for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = billing_clients.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = billing_clients.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
);

drop policy if exists "members can view billing items" on public.billing_items;
create policy "members can view billing items"
on public.billing_items for select
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = billing_items.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
  )
);

drop policy if exists "billing users can manage items" on public.billing_items;
create policy "billing users can manage items"
on public.billing_items for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = billing_items.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = billing_items.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin', 'billing')
  )
);
