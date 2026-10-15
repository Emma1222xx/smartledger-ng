-- DEMO SEED DATA — CLEARLY FICTIONAL — DEV ONLY
-- Never run against production. All names, numbers, and data are invented.
-- Insert a demo business manually with a known user ID after sign-up in dev.

-- Example (replace USER_ID with your actual auth.users.id from dev):
-- insert into businesses (id, name, phone, address)
--   values ('11111111-0000-0000-0000-000000000001', 'Demo Provision Store (FICTIONAL)', '08012345678', 'No. 1 Demo Street, Lagos');
--
-- insert into memberships (business_id, user_id, role)
--   values ('11111111-0000-0000-0000-000000000001', 'USER_ID_HERE', 'owner');
--
-- insert into products (business_id, name, sku, selling_price_kobo, unit_cost_kobo, stock_qty, low_stock_threshold)
-- values
--   ('11111111-0000-0000-0000-000000000001', 'Indomie Chicken 70g (DEMO)', 'IDM-CH-70', 15000, 11000, 150, 20),
--   ('11111111-0000-0000-0000-000000000001', 'Peak Milk Sachet 12pk (DEMO)', 'PK-S-12', 60000, 48000, 40, 10),
--   ('11111111-0000-0000-0000-000000000001', 'Dano Cool Cow 400g (DEMO)', 'DC-400', 210000, 170000, 8, 5);

-- This file is intentionally sparse. Run the commented-out statements
-- after signing up your first dev user to load sample data.
