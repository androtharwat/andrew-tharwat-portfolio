-- Extend service choices without reclassifying or deleting existing requests.
alter table public.move_now_leads drop constraint move_now_leads_service_check;
alter table public.move_now_leads add constraint move_now_leads_service_check
 check (service in ('buy','finish','rent','both','buy_cash','buy_installments','finish_sale','finish_rent','finish_furnish_rent'));
