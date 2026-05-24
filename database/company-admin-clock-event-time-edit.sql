-- Shiftly: allow company owners/admins to correct clock event date/time.
-- The frontend only updates created_at, but Postgres policies apply per row,
-- so keep this scoped to authenticated owner/admin members of the same company.

alter table public.clock_events enable row level security;

drop policy if exists "company admins can update company clock event times" on public.clock_events;
create policy "company admins can update company clock event times"
on public.clock_events for update
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = clock_events.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = clock_events.company_id
      and cu.user_id = auth.uid()
      and cu.active = true
      and cu.role in ('owner', 'admin')
  )
);
