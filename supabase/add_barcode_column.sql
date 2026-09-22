-- MarketBaza: mahsulotlarga shtrix-kod ustuni qo'shish
-- Supabase Dashboard -> SQL Editor -> New query -> shu faylni joylashtirib Run bosing.

alter table public.products
  add column if not exists barcode text;

create unique index if not exists products_barcode_unique_idx
  on public.products (barcode)
  where barcode is not null;