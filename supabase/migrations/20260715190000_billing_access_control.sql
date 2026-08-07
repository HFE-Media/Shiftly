-- Billing is a company add-on with an explicit per-user permission.
-- Access requires both flags plus an active owner/admin membership.

alter table public.companies
add column if not exists billing_enabled boolean not null default false;

alter table public.company_users
add column if not exists billing_access boolean not null default false;

alter table public.company_users
drop constraint if exists company_users_billing_access_role_check;

alter table public.company_users
add constraint company_users_billing_access_role_check
check (billing_access = false or role in ('owner', 'admin'));

create or replace function public.can_access_company_billing(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.companies c
    join public.company_users cu on cu.company_id = c.id
    where c.id = p_company_id
      and c.billing_enabled = true
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
      and cu.billing_access = true
  );
$$;

revoke all on function public.can_access_company_billing(uuid) from public;
grant execute on function public.can_access_company_billing(uuid) to authenticated;

-- Initial rollout: grant the add-on and permission only to the requested account's
-- existing owner/admin company memberships.
with granted_memberships as (
  update public.company_users cu
  set billing_access = true
  from auth.users u
  where cu.user_id = u.id
    and lower(u.email) = 'hfe.m3dia@gmail.com'
    and cu.active = true
    and cu.role in ('owner', 'admin')
  returning cu.company_id
)
update public.companies c
set billing_enabled = true
where c.id in (select company_id from granted_memberships);

do $$
begin
  if not exists (
    select 1
    from public.company_users cu
    join auth.users u on u.id = cu.user_id
    join public.companies c on c.id = cu.company_id
    where lower(u.email) = 'hfe.m3dia@gmail.com'
      and cu.active = true
      and cu.role in ('owner', 'admin')
      and cu.billing_access = true
      and c.billing_enabled = true
  ) then
    raise exception 'Initial billing owner/admin membership was not found';
  end if;
end;
$$;

drop policy if exists "members can view billing clients" on public.billing_clients;
drop policy if exists "billing users can manage clients" on public.billing_clients;
drop policy if exists "entitled owners and admins can access billing clients" on public.billing_clients;
create policy "entitled owners and admins can access billing clients"
on public.billing_clients for all to authenticated
using (public.can_access_company_billing(company_id))
with check (public.can_access_company_billing(company_id));

drop policy if exists "members can view billing items" on public.billing_items;
drop policy if exists "billing users can manage items" on public.billing_items;
drop policy if exists "entitled owners and admins can access billing items" on public.billing_items;
create policy "entitled owners and admins can access billing items"
on public.billing_items for all to authenticated
using (public.can_access_company_billing(company_id))
with check (public.can_access_company_billing(company_id));

drop policy if exists "members can view billing quotes" on public.billing_quotes;
drop policy if exists "billing users can manage quotes" on public.billing_quotes;
drop policy if exists "entitled owners and admins can access billing quotes" on public.billing_quotes;
create policy "entitled owners and admins can access billing quotes"
on public.billing_quotes for all to authenticated
using (public.can_access_company_billing(company_id))
with check (public.can_access_company_billing(company_id));

drop policy if exists "members can view billing quote items" on public.billing_quote_items;
drop policy if exists "billing users can manage quote items" on public.billing_quote_items;
drop policy if exists "entitled owners and admins can access billing quote items" on public.billing_quote_items;
create policy "entitled owners and admins can access billing quote items"
on public.billing_quote_items for all to authenticated
using (public.can_access_company_billing(company_id))
with check (public.can_access_company_billing(company_id));

drop policy if exists "members can view billing invoices" on public.billing_invoices;
drop policy if exists "billing users can manage invoices" on public.billing_invoices;
drop policy if exists "entitled owners and admins can access billing invoices" on public.billing_invoices;
create policy "entitled owners and admins can access billing invoices"
on public.billing_invoices for all to authenticated
using (public.can_access_company_billing(company_id))
with check (public.can_access_company_billing(company_id));

drop policy if exists "members can view billing invoice items" on public.billing_invoice_items;
drop policy if exists "billing users can manage invoice items" on public.billing_invoice_items;
drop policy if exists "entitled owners and admins can access billing invoice items" on public.billing_invoice_items;
create policy "entitled owners and admins can access billing invoice items"
on public.billing_invoice_items for all to authenticated
using (public.can_access_company_billing(company_id))
with check (public.can_access_company_billing(company_id));

drop policy if exists "members can view billing payments" on public.billing_payments;
drop policy if exists "billing users can manage payments" on public.billing_payments;
drop policy if exists "entitled owners and admins can access billing payments" on public.billing_payments;
create policy "entitled owners and admins can access billing payments"
on public.billing_payments for all to authenticated
using (public.can_access_company_billing(company_id))
with check (public.can_access_company_billing(company_id));

drop policy if exists "members can view billing company profiles" on public.billing_company_profiles;
drop policy if exists "billing users can manage company profiles" on public.billing_company_profiles;
drop policy if exists "entitled owners and admins can access billing company profiles" on public.billing_company_profiles;
create policy "entitled owners and admins can access billing company profiles"
on public.billing_company_profiles for all to authenticated
using (public.can_access_company_billing(company_id))
with check (public.can_access_company_billing(company_id));
