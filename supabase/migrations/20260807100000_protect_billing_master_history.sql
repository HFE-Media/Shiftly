-- Prevent permanent deletion of billing clients/items that are referenced by
-- historical or recurring documents. Deactivation remains available.

alter table public.billing_quotes
drop constraint if exists billing_quotes_client_id_fkey;
alter table public.billing_quotes
add constraint billing_quotes_client_id_fkey
foreign key (client_id) references public.billing_clients(id) on delete restrict;

alter table public.billing_invoices
drop constraint if exists billing_invoices_client_id_fkey;
alter table public.billing_invoices
add constraint billing_invoices_client_id_fkey
foreign key (client_id) references public.billing_clients(id) on delete restrict;

alter table public.billing_recurring_invoices
drop constraint if exists billing_recurring_invoices_client_id_fkey;
alter table public.billing_recurring_invoices
add constraint billing_recurring_invoices_client_id_fkey
foreign key (client_id) references public.billing_clients(id) on delete restrict;

alter table public.billing_quote_items
drop constraint if exists billing_quote_items_item_id_fkey;
alter table public.billing_quote_items
add constraint billing_quote_items_item_id_fkey
foreign key (item_id) references public.billing_items(id) on delete restrict;

alter table public.billing_invoice_items
drop constraint if exists billing_invoice_items_item_id_fkey;
alter table public.billing_invoice_items
add constraint billing_invoice_items_item_id_fkey
foreign key (item_id) references public.billing_items(id) on delete restrict;

alter table public.billing_recurring_invoice_items
drop constraint if exists billing_recurring_invoice_items_item_id_fkey;
alter table public.billing_recurring_invoice_items
add constraint billing_recurring_invoice_items_item_id_fkey
foreign key (item_id) references public.billing_items(id) on delete restrict;
