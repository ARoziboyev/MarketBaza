-- MarketBaza — Supabase schema
-- Supabase Dashboard -> SQL Editor'da faylni TO'LIQ ishga tushiring.
-- Bu skript qayta ishga tushirilsa ham mavjud jadvallarni buzmaydi.

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text default 'Umumiy',
  price numeric not null default 0,
  cost numeric not null default 0,
  qty numeric not null default 0,
  unit text default 'dona',
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  base_total numeric not null default 0,
  negotiated boolean not null default false,
  type text not null check (type in ('naqt','nasiya')),
  buyer_name text,
  buyer_phone text,
  status text not null default 'yopilgan' check (status in ('yopilgan','kutilmoqda')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.printer_settings (
  id int primary key default 1,
  printer_name text,
  conn_type text default 'usb',
  address text,
  saved_at timestamptz,
  constraint single_row check (id = 1)
);

create index if not exists sales_created_at_idx on public.sales (created_at desc);
create index if not exists sales_type_idx on public.sales (type);
create index if not exists products_name_idx on public.products (name);

alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.printer_settings enable row level security;

drop policy if exists "products_all" on public.products;
create policy "products_all" on public.products
  for all using (true) with check (true);

drop policy if exists "sales_all" on public.sales;
create policy "sales_all" on public.sales
  for all using (true) with check (true);

drop policy if exists "printer_settings_all" on public.printer_settings;
create policy "printer_settings_all" on public.printer_settings
  for all using (true) with check (true);

-- Realtime publication'iga jadvallarni faqat kerak bo'lsa qo'shadi.
-- Shuning uchun schema.sql'ni ikkinchi marta ishlatganda duplicate-table xatosi bermaydi.
do $$
begin
  begin
    alter publication supabase_realtime add table public.products;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.sales;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.printer_settings;
  exception when duplicate_object then null;
  end;
end $$;

-- Tekshiruv: quyidagi SELECT 3 ta jadval nomini qaytarishi kerak.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('products','sales','printer_settings')
order by table_name;
