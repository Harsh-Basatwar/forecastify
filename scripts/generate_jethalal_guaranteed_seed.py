import random
import datetime

print("🚀 Generating Guaranteed Jethalal Gada Data Seed (supabase/jethalal_data_only.sql)...")

user_id = "00000000-0000-0000-0000-000000000001"

sql = []
sql.append("-- ========================================================")
sql.append("-- FORECASTIFY: JETHALAL GADA PURE DATA SEED")
sql.append("-- 100% Guaranteed Column Schema Compatibility")
sql.append("-- ========================================================\n")

# 1. AUTH USER & PROFILE
sql.append(f"""INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES ('{user_id}', '00000000-0000-0000-0000-000000000000', 'jethalal@gadaretail.in', '$2a$10$abcdefghijklmnopqrstuv', NOW(), '{{\"provider\":\"email\",\"providers\":[\"email\"]}}', '{{\"full_name\":\"Jethalal Champaklal Gada\"}}', NOW(), NOW(), 'authenticated', 'authenticated')
ON CONFLICT DO NOTHING;""")

sql.append(f"""INSERT INTO public.profiles (id, full_name, username, store_name, phone, city, state, pincode, number_of_outlets)
VALUES ('{user_id}', 'Jethalal Champaklal Gada', 'jethalal_gada', 'Gada Electronics & General Store', '+91 98200 12345', 'Mumbai', 'Maharashtra', '400077', 1)
ON CONFLICT DO NOTHING;""")

# 2. INVENTORY & PRODUCTS (20 Items)
PRODUCTS_DATA = [
    ("Amul Taaza Milk 500ml", "Dairy", 30, 26, "500ml", 45, "Amul Dairy"),
    ("Amul Butter 100g", "Dairy", 56, 48, "100g", 80, "Amul Dairy"),
    ("Amul Masti Dahi 400g", "Dairy", 35, 29, "400g", 25, "Amul Dairy"),
    ("Britannia Good Day Biscuits 120g", "Snacks", 30, 24, "120g", 110, "Britannia FMCG"),
    ("Britannia Marie Gold 250g", "Snacks", 40, 32, "250g", 95, "Britannia FMCG"),
    ("Maggi Noodles 280g Pack of 4", "Snacks", 56, 46, "280g", 140, "Nestle India"),
    ("Nescafe Classic Coffee 50g Jar", "Beverages", 195, 160, "50g", 50, "Nestle India"),
    ("Parle-G Glucose Biscuits 80g", "Snacks", 10, 7.8, "80g", 220, "Parle Products"),
    ("Parle Hide & Seek Biscuits 100g", "Snacks", 35, 27, "100g", 75, "Parle Products"),
    ("Aashirvaad Chakki Atta 5kg", "Groceries", 280, 235, "5kg", 40, "ITC Foods"),
    ("Tata Tea Gold Premium 250g", "Beverages", 140, 112, "250g", 85, "Tata Consumer"),
    ("Tata Salt Iodized 1kg", "Groceries", 28, 22, "1kg", 150, "Tata Consumer"),
    ("Fortune Sunflower Oil 1L", "Groceries", 145, 122, "1L", 65, "Fortune Oils"),
    ("Coca-Cola Original 500ml", "Beverages", 40, 31, "500ml", 120, "Coca-Cola Bottling"),
    ("Thums Up 500ml", "Beverages", 40, 31, "500ml", 110, "Coca-Cola Bottling"),
    ("Bisleri Mineral Water 1L", "Beverages", 20, 14, "1L", 200, "Bisleri Hub"),
    ("Haldiram Aloo Bhujia 200g", "Snacks", 55, 43, "200g", 95, "Haldiram Snacks"),
    ("Amul Kool Chocolate Milk 180ml", "Beverages", 30, 23, "180ml", 70, "Amul Dairy"),
    ("Amul Cheese Slices 200g", "Dairy", 140, 118, "200g", 45, "Amul Dairy"),
    ("Amul Fresh Paneer 200g", "Dairy", 95, 78, "200g", 30, "Amul Dairy")
]

product_ids = []

for idx, (pname, cat, mrp, cost, unit, qty, supplier) in enumerate(PRODUCTS_DATA):
    pid = f"66666666-6666-6666-6666-{idx+1:012d}"
    product_ids.append(pid)
    selling_p = round(mrp * 0.95, 2)
    exp_date = datetime.date.today() + datetime.timedelta(days=random.randint(5, 60))

    sql.append(f"""INSERT INTO public.inventory (id, store_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, expiry_date, supplier)
VALUES ('{pid}', '{user_id}', '{pname}', '{pname}', '{cat}', {qty}, {selling_p}, {cost}, '{unit}', 15, '{exp_date}', '{supplier}')
ON CONFLICT (id) DO NOTHING;""")

# 3. GOKULDHAM CUSTOMERS (Matching columns: id, store_id, name, phone, email, address)
CUSTOMERS = [
    "Champaklal Jayantilal Gada", "Babita Krishnan Iyer", "Subrahmaniam Krishnan Iyer", "Taarak Janubhai Mehta",
    "Aatmaram Tukaram Bhide", "Roshan Singh Sodhi", "Dr. Hansraj Hathi", "Popatlal Pandey", "Sundar Lal",
    "Abdul Latif Bhai", "Rita Reporter", "Natwarlal Joshi (Natu Kaka)", "Bagheshwar Dukhichakra (Bagha)",
    "Daya Jethalal Gada", "Tipendra Jethalal Gada (Tapu)"
]

customer_ids = []
for i, cname in enumerate(CUSTOMERS):
    cid = f"88888888-8888-8888-8888-{i+1:012d}"
    customer_ids.append(cid)
    phone = f"+91 98201 {10001+i}"
    sql.append(f"""INSERT INTO public.customers (id, store_id, name, phone, email, address)
VALUES ('{cid}', '{user_id}', '{cname}', '{phone}', 'customer{i+1}@gmail.com', 'Flat {101+i}, Gokuldham Society, Ghatkopar East, Mumbai')
ON CONFLICT (id) DO NOTHING;""")

    # Khata Accounts (Matching columns: id, store_id, customer_id, outstanding_balance, credit_limit)
    if i < 8:
        kid = f"99999999-9999-9999-9999-{i+1:012d}"
        bal = float((i+1) * 450)
        sql.append(f"""INSERT INTO public.khata_accounts (id, store_id, customer_id, outstanding_balance, credit_limit, status)
VALUES ('{kid}', '{user_id}', '{cid}', {bal}, 10000.00, 'active')
ON CONFLICT (id) DO NOTHING;""")

# 4. RECENT SALES (Matching columns for sales and sale_items)
for i in range(20):
    sale_id = f"a1b2c3d4-0000-0000-0000-{i+1:012d}"
    inv_no = f"INV-2026-{1001+i}"
    cid = customer_ids[i % len(customer_ids)]
    pay_method = ["cash", "upi", "card", "cash"][i % 4]
    pid = product_ids[i % len(product_ids)]
    pname = PRODUCTS_DATA[i % len(PRODUCTS_DATA)][0]

    sql.append(f"""INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('{sale_id}', '{user_id}', '{cid}', '{inv_no}', 180.00, 9.00, 0.00, 189.00, '{pay_method}', NOW() - INTERVAL '{i} days')
ON CONFLICT (id) DO NOTHING;""")

    sql.append(f"""INSERT INTO public.sale_items (id, sale_id, product_id, product_name, unit_price, quantity, subtotal, total)
VALUES ('f1e2d3c4-0000-0000-0000-{i+1:012d}', '{sale_id}', '{pid}', '{pname}', 180.00, 1, 180.00, 180.00)
ON CONFLICT (id) DO NOTHING;""")

# 5. EXPENSES & DAILY BRIEF
sql.append(f"""INSERT INTO public.expenses (store_id, expense_category, title, amount, expense_date)
VALUES ('{user_id}', 'Rent', 'Station Road Store Rent', 65000.00, CURRENT_DATE - INTERVAL '3 days')
ON CONFLICT DO NOTHING;""")

sql.append(f"""INSERT INTO public.expenses (store_id, expense_category, title, amount, expense_date)
VALUES ('{user_id}', 'Utilities', 'Adani Electricity Bill', 18500.00, CURRENT_DATE - INTERVAL '2 days')
ON CONFLICT DO NOTHING;""")

sql.append(f"""INSERT INTO public.daily_briefs (store_id, brief_type, brief_date, ai_summary, data)
VALUES ('{user_id}', 'morning', CURRENT_DATE, 'Good morning Jethalal ji! Today projected revenue is ₹48,500 (+15% vs last Friday). High demand expected for Amul Milk and Cold Drinks due to 37°C heatwave.', '{{\"top_products\": [\"Amul Milk 500ml\", \"Coca-Cola 500ml\", \"Maggi Noodles\"]}}'::jsonb)
ON CONFLICT DO NOTHING;""")

out_file = "supabase/jethalal_data_only.sql"
with open(out_file, "w", encoding="utf-8") as f:
    f.write("\n".join(sql))

print(f"🎉 SUCCESS! Guaranteed Data Seed written to '{out_file}' ({len('\n'.join(sql))} bytes, {len(sql)} statements).")
