-- SmartLedger NG — Initial Schema & RLS
-- Money is stored as INTEGER (kobo = 1/100 naira) to avoid floating-point errors.
-- Timestamps use timestamptz (UTC); displayed in Africa/Lagos on the client.

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUM TYPES
-- ============================================================
create type payment_method as enum ('cash','bank_transfer','pos','credit','other');
create type debt_status as enum ('open','paid','overdue');
create type member_role as enum ('owner','staff');
create type expense_category as enum (
  'rent','utilities','salaries','transport','supplies',
  'maintenance','marketing','miscellaneous'
);

-- ============================================================
-- BUSINESSES
-- ============================================================
create table businesses (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null check (char_length(name) between 1 and 120),
  phone       text,
  email       text,
  address     text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- MEMBERSHIPS (business ↔ user)
-- ============================================================
create table memberships (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         member_role not null default 'staff',
  created_at   timestamptz not null default now(),
  unique(business_id, user_id)
);

create index idx_memberships_user on memberships(user_id);
create index idx_memberships_business on memberships(business_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table products (
  id                   uuid primary key default uuid_generate_v4(),
  business_id          uuid not null references businesses(id) on delete cascade,
  name                 text not null check (char_length(name) between 1 and 200),
  sku                  text,
  selling_price_kobo   integer not null check (selling_price_kobo >= 0),
  unit_cost_kobo       integer not null default 0 check (unit_cost_kobo >= 0),
  stock_qty            integer not null default 0 check (stock_qty >= 0),
  low_stock_threshold  integer not null default 5 check (low_stock_threshold >= 0),
  archived             boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_products_business on products(business_id) where not archived;

-- ============================================================
-- CUSTOMERS
-- ============================================================
create table customers (
  id                        uuid primary key default uuid_generate_v4(),
  business_id               uuid not null references businesses(id) on delete cascade,
  name                      text not null check (char_length(name) between 1 and 120),
  phone                     text,
  outstanding_balance_kobo  integer not null default 0 check (outstanding_balance_kobo >= 0),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index idx_customers_business on customers(business_id);

-- ============================================================
-- SALES
-- ============================================================
create table sales (
  id                       uuid primary key default uuid_generate_v4(),
  business_id              uuid not null references businesses(id) on delete cascade,
  customer_id              uuid references customers(id) on delete set null,
  customer_name_snapshot   text,
  payment_method           payment_method not null,
  total_kobo               integer not null check (total_kobo >= 0),
  amount_paid_kobo         integer not null check (amount_paid_kobo >= 0),
  credit_remaining_kobo    integer not null default 0 check (credit_remaining_kobo >= 0),
  note                     text,
  created_at               timestamptz not null default now(),
  constraint credit_only_when_payment_is_credit
    check (credit_remaining_kobo = 0 or payment_method = 'credit')
);

create index idx_sales_business_date on sales(business_id, created_at);
create index idx_sales_customer on sales(customer_id);

-- ============================================================
-- SALE ITEMS
-- ============================================================
create table sale_items (
  id                    uuid primary key default uuid_generate_v4(),
  sale_id               uuid not null references sales(id) on delete cascade,
  product_id            uuid references products(id) on delete set null,
  product_name_snapshot text not null,
  qty                   integer not null check (qty > 0),
  unit_price_kobo       integer not null check (unit_price_kobo >= 0),
  unit_cost_kobo        integer not null default 0,
  line_total_kobo       integer not null
    generated always as (qty * unit_price_kobo) stored
);

create index idx_sale_items_sale on sale_items(sale_id);
create index idx_sale_items_product on sale_items(product_id);

-- ============================================================
-- EXPENSES
-- ============================================================
create table expenses (
  id              uuid primary key default uuid_generate_v4(),
  business_id     uuid not null references businesses(id) on delete cascade,
  amount_kobo     integer not null check (amount_kobo > 0),
  category        expense_category not null,
  date            date not null,
  note            text,
  payment_method  payment_method not null,
  created_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_expenses_business_date on expenses(business_id, date);

-- ============================================================
-- CUSTOMER PAYMENTS (debt repayments)
-- ============================================================
create table customer_payments (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references businesses(id) on delete cascade,
  customer_id  uuid not null references customers(id) on delete cascade,
  sale_id      uuid references sales(id) on delete set null,
  amount_kobo  integer not null check (amount_kobo > 0),
  note         text,
  created_at   timestamptz not null default now()
);

create index idx_customer_payments_customer on customer_payments(customer_id);

-- ============================================================
-- INVENTORY MOVEMENTS (audit trail for stock changes)
-- ============================================================
create table inventory_movements (
  id            uuid primary key default uuid_generate_v4(),
  business_id   uuid not null references businesses(id) on delete cascade,
  product_id    uuid not null references products(id) on delete cascade,
  qty_change    integer not null,
  reason        text not null check (char_length(reason) between 1 and 200),
  reference_id  uuid,
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);

create index idx_inventory_movements_product on inventory_movements(product_id);

-- ============================================================
-- ACTIVITY LOG (security & business audit)
-- ============================================================
create table activity_logs (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid references businesses(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  meta         jsonb,
  created_at   timestamptz not null default now()
);

create index idx_activity_logs_business on activity_logs(business_id, created_at desc);

-- ============================================================
-- HELPER: resolve the caller's business_id from memberships
-- SECURITY DEFINER is safe here: we call it with no elevated
-- access and it only queries auth.uid() against memberships.
-- ============================================================
create or replace function my_business_id()
  returns uuid
  language sql stable
  security definer
  set search_path = public
as $$
  select business_id from memberships where user_id = auth.uid() limit 1;
$$;

-- ============================================================
-- SALE CREATION FUNCTION (transactional: sale + stock deduction)
-- Prevents double-deduction on retries if the sale id already exists.
-- ============================================================
create or replace function create_sale(
  p_id                     uuid,
  p_customer_id            uuid,
  p_customer_name_snapshot text,
  p_payment_method         payment_method,
  p_total_kobo             integer,
  p_amount_paid_kobo       integer,
  p_credit_remaining_kobo  integer,
  p_note                   text,
  p_items                  jsonb  -- array of {product_id, product_name_snapshot, qty, unit_price_kobo, unit_cost_kobo}
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_business_id uuid;
  v_item        jsonb;
  v_product     record;
begin
  v_business_id := my_business_id();
  if v_business_id is null then
    raise exception 'Not a member of any business';
  end if;

  -- Idempotency: if this sale ID already exists for this business, return it
  if exists (select 1 from sales where id = p_id and business_id = v_business_id) then
    return p_id;
  end if;

  -- Validate items and stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select stock_qty, archived into v_product
      from products
      where id = (v_item->>'product_id')::uuid
        and business_id = v_business_id;

    if not found then
      raise exception 'Product % not found', v_item->>'product_id';
    end if;
    if v_product.archived then
      raise exception 'Product % is archived', v_item->>'product_id';
    end if;
    if v_product.stock_qty < (v_item->>'qty')::integer then
      raise exception 'Insufficient stock for product %', v_item->>'product_id';
    end if;
  end loop;

  -- Insert sale
  insert into sales (id, business_id, customer_id, customer_name_snapshot,
                     payment_method, total_kobo, amount_paid_kobo,
                     credit_remaining_kobo, note)
  values (p_id, v_business_id, p_customer_id, p_customer_name_snapshot,
          p_payment_method, p_total_kobo, p_amount_paid_kobo,
          p_credit_remaining_kobo, p_note);

  -- Insert items + deduct stock
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into sale_items (sale_id, product_id, product_name_snapshot,
                             qty, unit_price_kobo, unit_cost_kobo)
    values (
      p_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name_snapshot',
      (v_item->>'qty')::integer,
      (v_item->>'unit_price_kobo')::integer,
      (v_item->>'unit_cost_kobo')::integer
    );

    update products
      set stock_qty  = stock_qty - (v_item->>'qty')::integer,
          updated_at = now()
      where id = (v_item->>'product_id')::uuid
        and business_id = v_business_id;

    insert into inventory_movements
      (business_id, product_id, qty_change, reason, reference_id, created_by)
    values
      (v_business_id, (v_item->>'product_id')::uuid,
       -((v_item->>'qty')::integer), 'sale', p_id, auth.uid());
  end loop;

  -- If credit sale, update customer balance
  if p_credit_remaining_kobo > 0 and p_customer_id is not null then
    update customers
      set outstanding_balance_kobo = outstanding_balance_kobo + p_credit_remaining_kobo,
          updated_at = now()
      where id = p_customer_id and business_id = v_business_id;
  end if;

  return p_id;
end;
$$;

-- ============================================================
-- RECORD CUSTOMER PAYMENT (reduces balance exactly once)
-- ============================================================
create or replace function record_customer_payment(
  p_customer_id  uuid,
  p_sale_id      uuid,
  p_amount_kobo  integer,
  p_note         text
)
  returns uuid
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_business_id  uuid;
  v_current_bal  integer;
  v_payment_id   uuid;
begin
  v_business_id := my_business_id();
  if v_business_id is null then
    raise exception 'Not a member of any business';
  end if;

  select outstanding_balance_kobo into v_current_bal
    from customers
    where id = p_customer_id and business_id = v_business_id
    for update;

  if not found then
    raise exception 'Customer not found';
  end if;
  if p_amount_kobo <= 0 then
    raise exception 'Payment amount must be positive';
  end if;
  if p_amount_kobo > v_current_bal then
    raise exception 'Payment % exceeds outstanding balance %', p_amount_kobo, v_current_bal;
  end if;

  insert into customer_payments (business_id, customer_id, sale_id, amount_kobo, note)
    values (v_business_id, p_customer_id, p_sale_id, p_amount_kobo, p_note)
    returning id into v_payment_id;

  update customers
    set outstanding_balance_kobo = outstanding_balance_kobo - p_amount_kobo,
        updated_at = now()
    where id = p_customer_id;

  return v_payment_id;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table businesses enable row level security;
alter table memberships enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table expenses enable row level security;
alter table customers enable row level security;
alter table customer_payments enable row level security;
alter table inventory_movements enable row level security;
alter table activity_logs enable row level security;

-- Businesses: readable/updatable by members only
create policy "members can read own business"
  on businesses for select
  using (id = my_business_id());

create policy "members can update own business"
  on businesses for update
  using (id = my_business_id())
  with check (id = my_business_id());

create policy "authenticated users can create a business"
  on businesses for insert
  with check (auth.role() = 'authenticated');

-- Memberships: owner can read; insert handled by create_business flow
create policy "members can read own memberships"
  on memberships for select
  using (business_id = my_business_id());

create policy "authenticated can insert membership for own user"
  on memberships for insert
  with check (user_id = auth.uid());

-- Products
create policy "members select products"
  on products for select
  using (business_id = my_business_id());

create policy "members insert products"
  on products for insert
  with check (business_id = my_business_id());

create policy "members update products"
  on products for update
  using (business_id = my_business_id())
  with check (business_id = my_business_id());

-- Sales (read-only from client; writes via create_sale function)
create policy "members select sales"
  on sales for select
  using (business_id = my_business_id());

create policy "members insert sales"
  on sales for insert
  with check (business_id = my_business_id());

-- Sale items
create policy "members select sale_items"
  on sale_items for select
  using (
    sale_id in (select id from sales where business_id = my_business_id())
  );

create policy "members insert sale_items"
  on sale_items for insert
  with check (
    sale_id in (select id from sales where business_id = my_business_id())
  );

-- Expenses
create policy "members select expenses"
  on expenses for select
  using (business_id = my_business_id());

create policy "members insert expenses"
  on expenses for insert
  with check (business_id = my_business_id());

create policy "members update own expenses"
  on expenses for update
  using (business_id = my_business_id() and created_by = auth.uid())
  with check (business_id = my_business_id());

create policy "members delete own expenses"
  on expenses for delete
  using (business_id = my_business_id() and created_by = auth.uid());

-- Customers
create policy "members select customers"
  on customers for select
  using (business_id = my_business_id());

create policy "members insert customers"
  on customers for insert
  with check (business_id = my_business_id());

create policy "members update customers"
  on customers for update
  using (business_id = my_business_id())
  with check (business_id = my_business_id());

-- Customer payments
create policy "members select customer_payments"
  on customer_payments for select
  using (business_id = my_business_id());

create policy "members insert customer_payments"
  on customer_payments for insert
  with check (business_id = my_business_id());

-- Inventory movements (read-only from client; written by functions)
create policy "members select inventory_movements"
  on inventory_movements for select
  using (business_id = my_business_id());

create policy "members insert inventory_movements"
  on inventory_movements for insert
  with check (business_id = my_business_id());

-- Activity logs
create policy "members select activity_logs"
  on activity_logs for select
  using (business_id = my_business_id());

create policy "members insert activity_logs"
  on activity_logs for insert
  with check (business_id = my_business_id());

-- ============================================================
-- DEMO / SEED DATA (clearly fictional — for local dev only)
-- Run this block separately ONLY in development; never in production.
-- ============================================================
-- (Seed data is in a separate file: supabase/seed.sql)
