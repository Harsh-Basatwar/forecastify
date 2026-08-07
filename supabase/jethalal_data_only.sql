CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Clean prior broken auth record
DELETE FROM auth.users WHERE email = 'jethalal@gadaretail.in' OR id = '00000000-0000-0000-0000-000000000001';

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, reauthentication_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'jethalal@gadaretail.in',
  crypt('Jethalal@123', gen_salt('bf')),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Jethalal Champaklal Gada"}',
  FALSE, NOW(), NOW(), '', '', '', '', ''
);
INSERT INTO public.profiles (id, full_name, username, store_name, phone, city, state, pincode, number_of_outlets)
VALUES ('00000000-0000-0000-0000-000000000001', 'Jethalal Champaklal Gada', 'jethalal_gada', 'Gada Electronics & General Store', '+91 98200 12345', 'Mumbai', 'Maharashtra', '400077', 1)
ON CONFLICT DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000001', '00000000-0000-0000-0000-000000000001', 'Amul Taaza Milk 500ml', 'Amul Taaza Milk 500ml', 'Dairy', 45, 28.5, 26, '500ml', 15, '2026-09-20', 'Amul Dairy')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000002', '00000000-0000-0000-0000-000000000001', 'Amul Butter 100g', 'Amul Butter 100g', 'Dairy', 80, 53.2, 48, '100g', 15, '2026-08-13', 'Amul Dairy')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000003', '00000000-0000-0000-0000-000000000001', 'Amul Masti Dahi 400g', 'Amul Masti Dahi 400g', 'Dairy', 25, 33.25, 29, '400g', 15, '2026-09-20', 'Amul Dairy')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000004', '00000000-0000-0000-0000-000000000001', 'Britannia Good Day Biscuits 120g', 'Britannia Good Day Biscuits 120g', 'Snacks', 110, 28.5, 24, '120g', 15, '2026-08-14', 'Britannia FMCG')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000005', '00000000-0000-0000-0000-000000000001', 'Britannia Marie Gold 250g', 'Britannia Marie Gold 250g', 'Snacks', 95, 38.0, 32, '250g', 15, '2026-08-25', 'Britannia FMCG')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000006', '00000000-0000-0000-0000-000000000001', 'Maggi Noodles 280g Pack of 4', 'Maggi Noodles 280g Pack of 4', 'Snacks', 140, 53.2, 46, '280g', 15, '2026-09-20', 'Nestle India')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000007', '00000000-0000-0000-0000-000000000001', 'Nescafe Classic Coffee 50g Jar', 'Nescafe Classic Coffee 50g Jar', 'Beverages', 50, 185.25, 160, '50g', 15, '2026-08-21', 'Nestle India')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000008', '00000000-0000-0000-0000-000000000001', 'Parle-G Glucose Biscuits 80g', 'Parle-G Glucose Biscuits 80g', 'Snacks', 220, 9.5, 7.8, '80g', 15, '2026-09-19', 'Parle Products')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000009', '00000000-0000-0000-0000-000000000001', 'Parle Hide & Seek Biscuits 100g', 'Parle Hide & Seek Biscuits 100g', 'Snacks', 75, 33.25, 27, '100g', 15, '2026-10-04', 'Parle Products')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000010', '00000000-0000-0000-0000-000000000001', 'Aashirvaad Chakki Atta 5kg', 'Aashirvaad Chakki Atta 5kg', 'Groceries', 40, 266.0, 235, '5kg', 15, '2026-09-06', 'ITC Foods')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000011', '00000000-0000-0000-0000-000000000001', 'Tata Tea Gold Premium 250g', 'Tata Tea Gold Premium 250g', 'Beverages', 85, 133.0, 112, '250g', 15, '2026-08-24', 'Tata Consumer')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000012', '00000000-0000-0000-0000-000000000001', 'Tata Salt Iodized 1kg', 'Tata Salt Iodized 1kg', 'Groceries', 150, 26.6, 22, '1kg', 15, '2026-08-25', 'Tata Consumer')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000013', '00000000-0000-0000-0000-000000000001', 'Fortune Sunflower Oil 1L', 'Fortune Sunflower Oil 1L', 'Groceries', 65, 137.75, 122, '1L', 15, '2026-08-15', 'Fortune Oils')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000014', '00000000-0000-0000-0000-000000000001', 'Coca-Cola Original 500ml', 'Coca-Cola Original 500ml', 'Beverages', 120, 38.0, 31, '500ml', 15, '2026-08-15', 'Coca-Cola Bottling')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000015', '00000000-0000-0000-0000-000000000001', 'Thums Up 500ml', 'Thums Up 500ml', 'Beverages', 110, 38.0, 31, '500ml', 15, '2026-09-30', 'Coca-Cola Bottling')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000016', '00000000-0000-0000-0000-000000000001', 'Bisleri Mineral Water 1L', 'Bisleri Mineral Water 1L', 'Beverages', 200, 19.0, 14, '1L', 15, '2026-08-29', 'Bisleri Hub')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000017', '00000000-0000-0000-0000-000000000001', 'Haldiram Aloo Bhujia 200g', 'Haldiram Aloo Bhujia 200g', 'Snacks', 95, 52.25, 43, '200g', 15, '2026-10-04', 'Haldiram Snacks')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000018', '00000000-0000-0000-0000-000000000001', 'Amul Kool Chocolate Milk 180ml', 'Amul Kool Chocolate Milk 180ml', 'Beverages', 70, 28.5, 23, '180ml', 15, '2026-08-17', 'Amul Dairy')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000019', '00000000-0000-0000-0000-000000000001', 'Amul Cheese Slices 200g', 'Amul Cheese Slices 200g', 'Dairy', 45, 133.0, 118, '200g', 15, '2026-08-30', 'Amul Dairy')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('66666666-6666-6666-6666-000000000020', '00000000-0000-0000-0000-000000000001', 'Amul Fresh Paneer 200g', 'Amul Fresh Paneer 200g', 'Dairy', 30, 90.25, 78, '200g', 15, '2026-08-13', 'Amul Dairy')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000001', '00000000-0000-0000-0000-000000000001', 'Champaklal Jayantilal Gada', '+91 98201 10001', 'customer1@gmail.com', 'Flat 101, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.khata_accounts (id, store_id, customer_id, outstanding_balance, credit_limit, status)
VALUES ('99999999-9999-9999-9999-000000000001', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000001', 450.0, 10000.00, 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000002', '00000000-0000-0000-0000-000000000001', 'Babita Krishnan Iyer', '+91 98201 10002', 'customer2@gmail.com', 'Flat 102, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.khata_accounts (id, store_id, customer_id, outstanding_balance, credit_limit, status)
VALUES ('99999999-9999-9999-9999-000000000002', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000002', 900.0, 10000.00, 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000003', '00000000-0000-0000-0000-000000000001', 'Subrahmaniam Krishnan Iyer', '+91 98201 10003', 'customer3@gmail.com', 'Flat 103, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.khata_accounts (id, store_id, customer_id, outstanding_balance, credit_limit, status)
VALUES ('99999999-9999-9999-9999-000000000003', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000003', 1350.0, 10000.00, 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000004', '00000000-0000-0000-0000-000000000001', 'Taarak Janubhai Mehta', '+91 98201 10004', 'customer4@gmail.com', 'Flat 104, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.khata_accounts (id, store_id, customer_id, outstanding_balance, credit_limit, status)
VALUES ('99999999-9999-9999-9999-000000000004', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000004', 1800.0, 10000.00, 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000005', '00000000-0000-0000-0000-000000000001', 'Aatmaram Tukaram Bhide', '+91 98201 10005', 'customer5@gmail.com', 'Flat 105, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.khata_accounts (id, store_id, customer_id, outstanding_balance, credit_limit, status)
VALUES ('99999999-9999-9999-9999-000000000005', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000005', 2250.0, 10000.00, 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000006', '00000000-0000-0000-0000-000000000001', 'Roshan Singh Sodhi', '+91 98201 10006', 'customer6@gmail.com', 'Flat 106, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.khata_accounts (id, store_id, customer_id, outstanding_balance, credit_limit, status)
VALUES ('99999999-9999-9999-9999-000000000006', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000006', 2700.0, 10000.00, 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000007', '00000000-0000-0000-0000-000000000001', 'Dr. Hansraj Hathi', '+91 98201 10007', 'customer7@gmail.com', 'Flat 107, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.khata_accounts (id, store_id, customer_id, outstanding_balance, credit_limit, status)
VALUES ('99999999-9999-9999-9999-000000000007', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000007', 3150.0, 10000.00, 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000008', '00000000-0000-0000-0000-000000000001', 'Popatlal Pandey', '+91 98201 10008', 'customer8@gmail.com', 'Flat 108, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.khata_accounts (id, store_id, customer_id, outstanding_balance, credit_limit, status)
VALUES ('99999999-9999-9999-9999-000000000008', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000008', 3600.0, 10000.00, 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000009', '00000000-0000-0000-0000-000000000001', 'Sundar Lal', '+91 98201 10009', 'customer9@gmail.com', 'Flat 109, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000010', '00000000-0000-0000-0000-000000000001', 'Abdul Latif Bhai', '+91 98201 10010', 'customer10@gmail.com', 'Flat 110, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000011', '00000000-0000-0000-0000-000000000001', 'Rita Reporter', '+91 98201 10011', 'customer11@gmail.com', 'Flat 111, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000012', '00000000-0000-0000-0000-000000000001', 'Natwarlal Joshi (Natu Kaka)', '+91 98201 10012', 'customer12@gmail.com', 'Flat 112, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000013', '00000000-0000-0000-0000-000000000001', 'Bagheshwar Dukhichakra (Bagha)', '+91 98201 10013', 'customer13@gmail.com', 'Flat 113, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000014', '00000000-0000-0000-0000-000000000001', 'Daya Jethalal Gada', '+91 98201 10014', 'customer14@gmail.com', 'Flat 114, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('88888888-8888-8888-8888-000000000015', '00000000-0000-0000-0000-000000000001', 'Tipendra Jethalal Gada (Tapu)', '+91 98201 10015', 'customer15@gmail.com', 'Flat 115, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000001', 'INV-2026-1001', 180.00, 9.00, 0.00, 189.00, 'cash', NOW() - INTERVAL '0 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', '66666666-6666-6666-6666-000000000001', 'Amul Taaza Milk 500ml', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000002', 'INV-2026-1002', 180.00, 9.00, 0.00, 189.00, 'upi', NOW() - INTERVAL '1 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000002', '66666666-6666-6666-6666-000000000002', 'Amul Butter 100g', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000003', 'INV-2026-1003', 180.00, 9.00, 0.00, 189.00, 'card', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000003', '66666666-6666-6666-6666-000000000003', 'Amul Masti Dahi 400g', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000004', 'INV-2026-1004', 180.00, 9.00, 0.00, 189.00, 'cash', NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000004', '66666666-6666-6666-6666-000000000004', 'Britannia Good Day Biscuits 120g', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000005', 'INV-2026-1005', 180.00, 9.00, 0.00, 189.00, 'cash', NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000005', 'a1b2c3d4-0000-0000-0000-000000000005', '66666666-6666-6666-6666-000000000005', 'Britannia Marie Gold 250g', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000006', 'INV-2026-1006', 180.00, 9.00, 0.00, 189.00, 'upi', NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000006', 'a1b2c3d4-0000-0000-0000-000000000006', '66666666-6666-6666-6666-000000000006', 'Maggi Noodles 280g Pack of 4', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000007', 'INV-2026-1007', 180.00, 9.00, 0.00, 189.00, 'card', NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000007', 'a1b2c3d4-0000-0000-0000-000000000007', '66666666-6666-6666-6666-000000000007', 'Nescafe Classic Coffee 50g Jar', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000008', 'INV-2026-1008', 180.00, 9.00, 0.00, 189.00, 'cash', NOW() - INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000008', 'a1b2c3d4-0000-0000-0000-000000000008', '66666666-6666-6666-6666-000000000008', 'Parle-G Glucose Biscuits 80g', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000009', 'INV-2026-1009', 180.00, 9.00, 0.00, 189.00, 'cash', NOW() - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000009', 'a1b2c3d4-0000-0000-0000-000000000009', '66666666-6666-6666-6666-000000000009', 'Parle Hide & Seek Biscuits 100g', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000010', 'INV-2026-1010', 180.00, 9.00, 0.00, 189.00, 'upi', NOW() - INTERVAL '9 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000010', 'a1b2c3d4-0000-0000-0000-000000000010', '66666666-6666-6666-6666-000000000010', 'Aashirvaad Chakki Atta 5kg', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000011', 'INV-2026-1011', 180.00, 9.00, 0.00, 189.00, 'card', NOW() - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000011', 'a1b2c3d4-0000-0000-0000-000000000011', '66666666-6666-6666-6666-000000000011', 'Tata Tea Gold Premium 250g', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000012', 'INV-2026-1012', 180.00, 9.00, 0.00, 189.00, 'cash', NOW() - INTERVAL '11 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000012', 'a1b2c3d4-0000-0000-0000-000000000012', '66666666-6666-6666-6666-000000000012', 'Tata Salt Iodized 1kg', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000013', 'INV-2026-1013', 180.00, 9.00, 0.00, 189.00, 'cash', NOW() - INTERVAL '12 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000013', 'a1b2c3d4-0000-0000-0000-000000000013', '66666666-6666-6666-6666-000000000013', 'Fortune Sunflower Oil 1L', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000014', 'INV-2026-1014', 180.00, 9.00, 0.00, 189.00, 'upi', NOW() - INTERVAL '13 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000014', 'a1b2c3d4-0000-0000-0000-000000000014', '66666666-6666-6666-6666-000000000014', 'Coca-Cola Original 500ml', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000015', 'INV-2026-1015', 180.00, 9.00, 0.00, 189.00, 'card', NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000015', 'a1b2c3d4-0000-0000-0000-000000000015', '66666666-6666-6666-6666-000000000015', 'Thums Up 500ml', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000001', 'INV-2026-1016', 180.00, 9.00, 0.00, 189.00, 'cash', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000016', 'a1b2c3d4-0000-0000-0000-000000000016', '66666666-6666-6666-6666-000000000016', 'Bisleri Mineral Water 1L', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000002', 'INV-2026-1017', 180.00, 9.00, 0.00, 189.00, 'cash', NOW() - INTERVAL '16 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000017', 'a1b2c3d4-0000-0000-0000-000000000017', '66666666-6666-6666-6666-000000000017', 'Haldiram Aloo Bhujia 200g', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000003', 'INV-2026-1018', 180.00, 9.00, 0.00, 189.00, 'upi', NOW() - INTERVAL '17 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000018', 'a1b2c3d4-0000-0000-0000-000000000018', '66666666-6666-6666-6666-000000000018', 'Amul Kool Chocolate Milk 180ml', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000004', 'INV-2026-1019', 180.00, 9.00, 0.00, 189.00, 'card', NOW() - INTERVAL '18 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000019', 'a1b2c3d4-0000-0000-0000-000000000019', '66666666-6666-6666-6666-000000000019', 'Amul Cheese Slices 200g', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('a1b2c3d4-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', '88888888-8888-8888-8888-000000000005', 'INV-2026-1020', 180.00, 9.00, 0.00, 189.00, 'cash', NOW() - INTERVAL '19 days')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-000000000020', 'a1b2c3d4-0000-0000-0000-000000000020', '66666666-6666-6666-6666-000000000020', 'Amul Fresh Paneer 200g', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.expenses (store_id, expense_type, amount, description, expense_date)
VALUES ('00000000-0000-0000-0000-000000000001', 'Rent', 65000.00, 'Station Road Store Rent', CURRENT_DATE - INTERVAL '3 days')
ON CONFLICT DO NOTHING;
INSERT INTO public.expenses (store_id, expense_type, amount, description, expense_date)
VALUES ('00000000-0000-0000-0000-000000000001', 'Utilities', 18500.00, 'Adani Electricity Bill', CURRENT_DATE - INTERVAL '2 days')
ON CONFLICT DO NOTHING;
INSERT INTO public.daily_briefs (store_id, brief_type, brief_date, ai_summary, data)
VALUES ('00000000-0000-0000-0000-000000000001', 'morning', CURRENT_DATE, 'Good morning Jethalal ji! Today projected revenue is ₹48,500 (+15% vs last Friday). High demand expected for Amul Milk and Cold Drinks due to 37°C heatwave.', '{"top_products": ["Amul Milk 500ml", "Coca-Cola 500ml", "Maggi Noodles"]}'::jsonb)
ON CONFLICT DO NOTHING;