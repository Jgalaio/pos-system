create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  category text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  total numeric(10, 2) not null default 0 check (total >= 0),
  payment_method text not null default 'numerario',
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  total numeric(10, 2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists products_active_sort_idx on public.products(active, sort_order, name);
create index if not exists sales_created_at_idx on public.sales(created_at);
create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);

alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "Public read products" on public.products;
drop policy if exists "Public manage products" on public.products;
drop policy if exists "Public read sales" on public.sales;
drop policy if exists "Public create sales" on public.sales;
drop policy if exists "Public cleanup recent sales" on public.sales;
drop policy if exists "Public read sale items" on public.sale_items;
drop policy if exists "Public create sale items" on public.sale_items;

create policy "Public read products"
on public.products for select
to anon
using (true);

create policy "Public manage products"
on public.products for all
to anon
using (true)
with check (true);

create policy "Public read sales"
on public.sales for select
to anon
using (true);

create policy "Public create sales"
on public.sales for insert
to anon
with check (true);

create policy "Public cleanup recent sales"
on public.sales for delete
to anon
using (created_at > now() - interval '10 minutes');

create policy "Public read sale items"
on public.sale_items for select
to anon
using (true);

create policy "Public create sale items"
on public.sale_items for insert
to anon
with check (true);

insert into public.products (name, price, category, sort_order)
values
  ('Cerveja', 1.50, 'Bebidas', 10),
  ('Sangria', 2.50, 'Bebidas', 20),
  ('Bifana', 3.50, 'Comida', 30)
on conflict do nothing;
