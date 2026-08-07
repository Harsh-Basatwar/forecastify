import random
import datetime
import uuid

print("🚀 Generating Lightweight Presentation Seed Script (supabase/seed_presentation.sql)...")

user_id = "00000000-0000-0000-0000-000000000001"
org_id = "11111111-1111-1111-1111-111111111111"
store_ids = [
    "22222222-2222-2222-2222-222222222221", # Main Ghatkopar
    "22222222-2222-2222-2222-222222222222", # Dadar
    "22222222-2222-2222-2222-222222222223", # Bandra
    "22222222-2222-2222-2222-222222222224", # Thane
    "22222222-2222-2222-2222-222222222225"  # Borivali
]
main_store_id = store_ids[0]

sql = []
sql.append("-- ========================================================")
sql.append("-- FORECASTIFY PRESENTATION SEED SCRIPT (LIGHTWEIGHT)")
sql.append("-- Owner: Jethalal Champaklal Gada | Gada Retail Group")
sql.append("-- Perfect for live demo & hackathon presentation")
sql.append("-- ========================================================\n")

# 1. USER, ORG & STORES
sql.append("INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)")
sql.append(f"VALUES ('{user_id}', '00000000-0000-0000-0000-000000000000', 'jethalal@gadaretail.in', '$2a$10$abcdefghijklmnopqrstuv', NOW(), '{{\"provider\":\"email\",\"providers\":[\"email\"]}}', '{{\"full_name\":\"Jethalal Champaklal Gada\"}}', NOW(), NOW(), 'authenticated', 'authenticated') ON CONFLICT (id) DO NOTHING;")

sql.append(f"INSERT INTO public.profiles (id, full_name, username, store_name, phone, city, state, pincode, number_of_outlets) VALUES ('{user_id}', 'Jethalal Champaklal Gada', 'jethalal_gada', 'Gada Electronics & General Store', '+91 98200 12345', 'Mumbai', 'Maharashtra', '400077', 5) ON CONFLICT (id) DO NOTHING;")

sql.append(f"INSERT INTO public.organizations (id, name, slug, tax_id_gstin, currency, time_zone, plan, subscription_status, max_stores, max_users, is_active) VALUES ('{org_id}', 'Gada Retail Group', 'gada-retail-group', '27AABCG1234F1Z5', 'INR', 'Asia/Kolkata', 'enterprise', 'active', 10, 50, true) ON CONFLICT (id) DO NOTHING;")

stores_data = [
    (store_ids[0], "GADA-GHATKOPAR-01", "Gada Electronics & General Store", "retail", "Gada House, Station Road, Ghatkopar East", "400077", "+91 98200 12345", "27AABCG1234F1Z5"),
    (store_ids[1], "GADA-DADAR-02", "Gada Retail - Dadar Branch", "retail", "Ranade Road, Dadar West", "400028", "+91 98200 12346", "27AABCG1234F2Z4"),
    (store_ids[2], "GADA-BANDRA-03", "Gada Retail - Bandra Express", "retail", "Hill Road, Bandra West", "400050", "+91 98200 12347", "27AABCG1234F3Z3"),
    (store_ids[3], "GADA-THANE-04", "Gada Retail - Thane Central Warehouse", "warehouse", "Wagle Estate, Thane West", "400604", "+91 98200 12348", "27AABCG1234F4Z2"),
    (store_ids[4], "GADA-BORIVALI-05", "Gada Retail - Borivali Kirana", "retail", "SV Road, Borivali West", "400092", "+91 98200 12349", "27AABCG1234F5Z1")
]

for sid, code, name, stype, addr, pin, ph, gst in stores_data:
    sql.append(f"INSERT INTO public.stores (id, organization_id, code, name, store_type, status, address, city, state, pincode, phone, gstin, owner_id) VALUES ('{sid}', '{org_id}', '{code}', '{name}', '{stype}', 'ACTIVE', '{addr}', 'Mumbai', 'Maharashtra', '{pin}', '{ph}', '{gst}', '{user_id}') ON CONFLICT (id) DO NOTHING;")
    sql.append(f"INSERT INTO public.store_users (store_id, user_id, role) VALUES ('{sid}', '{user_id}', 'organization_owner') ON CONFLICT DO NOTHING;")

# 2. 10 SUPPLIERS
SUPPLIERS = [
    ("Amul Dairy Distributors", "Anand / Mumbai", "27AAAAA0000A1Z5"),
    ("Britannia FMCG Agencies", "Bhiwandi, Thane", "27BBBBB1111B1Z4"),
    ("Parle Products Wholesalers", "Vile Parle, Mumbai", "27CCCCC2222C1Z3"),
    ("Tata Consumer Products", "Lower Parel, Mumbai", "27DDDDD3333D1Z2"),
    ("ITC Foods Division", "Andheri East, Mumbai", "27EEEEE4444E1Z1"),
    ("Nestle India Supply Center", "Navi Mumbai", "27FFFFF5555F1Z0"),
    ("Fortune Edible Oils", "Kandivali, Mumbai", "27GGGGG6666G1Z9"),
    ("Haldiram Snacks Traders", "Bhiwandi, Thane", "27IIIII8888I1Z7"),
    ("Coca-Cola Bottling Depot", "Thane West", "27KKKKK0000K1Z5"),
    ("Bisleri International Hub", "Andheri East", "27MMMMM2222M1Z3")
]

supplier_ids = []
for i, (sname, sloc, gstin) in enumerate(SUPPLIERS):
    sid = f"33333333-3333-3333-3333-{i+1:012d}"
    supplier_ids.append(sid)
    sql.append(f"INSERT INTO public.suppliers (id, store_id, name, contact_person, email, phone, address, lead_time_days, payment_terms, rating, gstin) VALUES ('{sid}', '{user_id}', '{sname}', 'Rajesh Manager', 'orders@{sname.lower().replace(' ', '')[:10]}.com', '+91 98200 {10000+i}', '{sloc}', 2, 'Net 30', 4.8, '{gstin}') ON CONFLICT (id) DO NOTHING;")

# 3. CATEGORIES & BRANDS
CATEGORIES = ["Dairy", "Beverages", "Snacks", "Groceries", "Personal Care"]
cat_ids = {}
for i, cname in enumerate(CATEGORIES):
    cid = f"44444444-4444-4444-4444-{i+1:012d}"
    cat_ids[cname] = cid
    sql.append(f"INSERT INTO public.categories (id, store_id, name, description) VALUES ('{cid}', '{user_id}', '{cname}', '{cname} Category') ON CONFLICT (id) DO NOTHING;")

BRANDS = ["Amul", "Britannia", "Nestle", "Parle", "ITC", "Tata", "Fortune", "Haldiram", "Coca-Cola", "Bisleri"]
brand_ids = {}
for i, bname in enumerate(BRANDS):
    bid = f"55555555-5555-5555-5555-{i+1:012d}"
    brand_ids[bname] = bid
    sql.append(f"INSERT INTO public.brands (id, store_id, name, description) VALUES ('{bid}', '{user_id}', '{bname}', '{bname} Brand') ON CONFLICT (id) DO NOTHING;")

# 4. 25 CORE DEMO PRODUCTS & BATCHES
PRODUCTS = [
    ("Amul Taaza Milk 500ml", "Dairy", "Amul", 30, 26, "500ml", 5, 45),
    ("Amul Butter 100g", "Dairy", "Amul", 56, 48, "100g", 30, 80),
    ("Amul Masti Dahi 400g", "Dairy", "Amul", 35, 29, "400g", 7, 25),
    ("Britannia Good Day Biscuits 120g", "Snacks", "Britannia", 30, 24, "120g", 180, 110),
    ("Britannia Marie Gold 250g", "Snacks", "Britannia", 40, 32, "250g", 180, 95),
    ("Nestle Maggi Noodles 280g (Pack of 4)", "Snacks", "Nestle", 56, 46, "280g", 240, 140),
    ("Nestle Nescafe Coffee 50g Jar", "Beverages", "Nestle", 195, 160, "50g", 365, 50),
    ("Parle-G Glucose Biscuits 80g", "Snacks", "Parle", 10, 7.8, "80g", 180, 220),
    ("Parle Hide & Seek Biscuits 100g", "Snacks", "Parle", 35, 27, "100g", 180, 75),
    ("Aashirvaad Chakki Atta 5kg", "Groceries", "ITC", 280, 235, "5kg", 120, 40),
    ("Dark Fantasy Choco Fills 75g", "Snacks", "ITC", 45, 35, "75g", 180, 60),
    ("Tata Tea Gold Premium 250g", "Beverages", "Tata", 140, 112, "250g", 365, 85),
    ("Tata Salt Iodized 1kg", "Groceries", "Tata", 28, 22, "1kg", 365, 150),
    ("Fortune Sunflower Oil 1L Pouch", "Groceries", "Fortune", 145, 122, "1L", 180, 65),
    ("Coca-Cola Original 500ml Bottle", "Beverages", "Coca-Cola", 40, 31, "500ml", 120, 120),
    ("Thums Up 500ml Bottle", "Beverages", "Coca-Cola", 40, 31, "500ml", 120, 110),
    ("Sprite 500ml Bottle", "Beverages", "Coca-Cola", 40, 31, "500ml", 120, 90),
    ("Bisleri Mineral Water 1L Bottle", "Beverages", "Bisleri", 20, 14, "1L", 180, 200),
    ("Haldiram Aloo Bhujia 200g", "Snacks", "Haldiram", 55, 43, "200g", 180, 95),
    ("Haldiram Khatta Meetha 200g", "Snacks", "Haldiram", 55, 43, "200g", 180, 80),
    ("Amul Kool Chocolate Milk 180ml", "Beverages", "Amul", 30, 23, "180ml", 90, 70),
    ("Amul Cheese Slices 200g", "Dairy", "Amul", 140, 118, "200g", 90, 45),
    ("Amul Fresh Paneer 200g", "Dairy", "Amul", 95, 78, "200g", 15, 30),
    ("Fortune Kachi Ghani Mustard Oil 1L", "Groceries", "Fortune", 165, 138, "1L", 180, 50),
    ("Tata Sampann Toor Dal 1kg", "Groceries", "Tata", 165, 138, "1kg", 180, 40)
]

product_ids = []
batch_ids = []

for idx, (pname, cat_name, brand_name, mrp, cost_price, unit, shelf, stock_qty) in enumerate(PRODUCTS):
    pid = f"66666666-6666-6666-6666-{idx+1:012d}"
    product_ids.append(pid)
    selling_price = round(mrp * 0.95, 2)
    sku = f"SKU-GADA-{idx+101}"
    barcode = f"8901058{idx+10001:05d}"
    aisle = f"Aisle {(idx%4)+1} - Rack {chr(65 + (idx%3))}"
    sup_id = supplier_ids[idx % len(supplier_ids)]

    sql.append(f"INSERT INTO public.products (id, store_id, name, sku, barcode, category_id, brand_id, mrp, cost_price, selling_price, unit, gst_rate, reorder_level, safety_stock, shelf_location, supplier_id) VALUES ('{pid}', '{main_store_id}', '{pname}', '{sku}', '{barcode}', '{cat_ids[cat_name]}', '{brand_ids[brand_name]}', {mrp}, {cost_price}, {selling_price}, '{unit}', 0.05, 15, 5, '{aisle}', '{sup_id}') ON CONFLICT (id) DO NOTHING;")
    sql.append(f"INSERT INTO public.inventory (id, store_id, product_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, supplier) VALUES ('{pid}', '{main_store_id}', '{pid}', '{pname}', '{pname}', '{cat_name}', {stock_qty}, {selling_price}, {cost_price}, '{unit}', 15, '{sup_id}') ON CONFLICT (id) DO NOTHING;")

    bid = f"77777777-7777-7777-7777-{idx+1:012d}"
    batch_ids.append(bid)
    mfg = datetime.date.today() - datetime.timedelta(days=15)
    exp = mfg + datetime.timedelta(days=shelf)
    sql.append(f"INSERT INTO public.product_batches (id, product_id, batch_number, mfg_date, expiry_date, quantity, purchase_price) VALUES ('{bid}', '{pid}', 'BATCH-2026-{idx+101}', '{mfg}', '{exp}', {stock_qty}, {cost_price}) ON CONFLICT (id) DO NOTHING;")

# 5. GOKULDHAM CUSTOMERS & KHATA ACCOUNTS
CUSTOMERS = [
    "Champaklal Jayantilal Gada", "Babita Krishnan Iyer", "Subrahmaniam Krishnan Iyer", "Taarak Janubhai Mehta",
    "Aatmaram Tukaram Bhide", "Roshan Singh Sodhi", "Dr. Hansraj Hathi", "Popatlal Pandey", "Sundar Lal",
    "Abdul Latif Bhai", "Rita Reporter", "Natwarlal Joshi (Natu Kaka)", "Bagheshwar Dukhichakra (Bagha)",
    "Daya Jethalal Gada", "Tipendra Jethalal Gada (Tapu)", "Anjali Taarak Mehta", "Madhavi Aatmaram Bhide",
    "Komal Hansraj Hathi", "Roshan Kaur Sodhi", "Sonalika Bhide (Sonu)"
]

customer_ids = []
for i, cname in enumerate(CUSTOMERS):
    cid = f"88888888-8888-8888-8888-{i+1:012d}"
    customer_ids.append(cid)
    phone = f"+91 98201 {10001+i}"
    sql.append(f"INSERT INTO public.customers (id, name, phone, email, address, loyalty_points, customer_type) VALUES ('{cid}', '{cname}', '{phone}', 'customer{i+1}@gmail.com', 'Flat {101+i}, Gokuldham Society, Ghatkopar East, Mumbai', {1500 + i*100}, 'VIP') ON CONFLICT (id) DO NOTHING;")

    if i < 10: # 10 Khata Accounts
        kid = f"99999999-9999-9999-9999-{i+1:012d}"
        bal = float((i+1) * 350)
        sql.append(f"INSERT INTO public.khata_accounts (id, customer_id, store_id, current_balance, credit_limit, status) VALUES ('{kid}', '{cid}', '{main_store_id}', {bal}, 10000.00, 'ACTIVE') ON CONFLICT (id) DO NOTHING;")
        sql.append(f"INSERT INTO public.khata_transactions (khata_account_id, store_id, transaction_type, amount, balance_after, notes) VALUES ('{kid}', '{main_store_id}', 'DEBIT', {bal}, {bal}, 'Weekly Groceries Credit') ON CONFLICT DO NOTHING;")

# 6. RECENT POS SALES TRANSACTIONS (50 TRANSACTIONS)
for i in range(50):
    sale_id = str(uuid.uuid4())
    inv_no = f"INV-2026-{1001+i}"
    cid = customer_ids[i % len(customer_ids)]
    pay_method = ["UPI_GPAY", "CASH", "KHATA_CREDIT", "UPI_PHONEPE"][i % 4]
    
    p1 = product_ids[i % len(product_ids)]
    p2 = product_ids[(i+1) % len(product_ids)]
    b1 = batch_ids[i % len(batch_ids)]
    b2 = batch_ids[(i+1) % len(batch_ids)]

    subtot = 180.00
    tax = 9.00
    gtot = 189.00

    sql.append(f"INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at) VALUES ('{sale_id}', '{main_store_id}', '{cid}', '{inv_no}', {subtot}, {tax}, 0.00, {gtot}, '{pay_method}', CURRENT_DATE - INTERVAL '{i % 10} days');")
    sql.append(f"INSERT INTO public.sale_items (id, sale_id, product_id, batch_id, unit_price, quantity, total_price) VALUES ('{uuid.uuid4()}', '{sale_id}', '{p1}', '{b1}', 100.00, 1, 100.00);")
    sql.append(f"INSERT INTO public.sale_items (id, sale_id, product_id, batch_id, unit_price, quantity, total_price) VALUES ('{uuid.uuid4()}', '{sale_id}', '{p2}', '{b2}', 80.00, 1, 80.00);")

# 7. AI FORECAST PREDICTIONS
for i in range(15):
    pid = product_ids[i]
    fdate = datetime.date.today() + datetime.timedelta(days=i)
    sql.append(f"INSERT INTO public.forecast_predictions (id, store_id, product_id, forecast_date, predicted_demand, confidence_lower, confidence_upper, weather_impact_multiplier) VALUES ('{uuid.uuid4()}', '{main_store_id}', '{pid}', '{fdate}', {45 + i*2}, {35 + i*2}, {55 + i*2}, 1.45) ON CONFLICT DO NOTHING;")

# 8. AI RECOMMENDATIONS & EXPLAINABILITY
RECS = [
    ("REORDER_SOON", "Reorder Urgent: Cold Beverages", "Temperature forecast 39°C heatwave. Reorder 60 units of Bisleri 1L & Coca-Cola."),
    ("DISCOUNT_NEAR_EXPIRY", "Discount 25%: Amul Dahi Batch #103", "Batch #103 expiring in 4 days. Apply 25% markdown clearance."),
    ("STOCK_TRANSFER", "Transfer 40 Units from Thane Warehouse", "Bandra branch experiencing demand surge for Atta and Dairy."),
    ("CROSS_SELL_PROMO", "Bundle Promo: Tata Tea + Parle-G", "Co-purchase affinity score 78% between Tata Tea and Parle-G Biscuits.")
]

for i, (rtype, rtitle, rdesc) in enumerate(RECS):
    rec_id = str(uuid.uuid4())
    pid = product_ids[i]
    sql.append(f"INSERT INTO public.forecast_recommendations (id, store_id, product_id, recommendation_type, title, description, impact_score, status) VALUES ('{rec_id}', '{main_store_id}', '{pid}', '{rtype}', '{rtitle}', '{rdesc}', 9.5, 'ACTIVE') ON CONFLICT DO NOTHING;")
    sql.append(f"INSERT INTO public.explanation_records (id, recommendation_id, explanation_text, evidence_summary) VALUES ('{uuid.uuid4()}', '{rec_id}', 'AI Model evaluated historical velocity (+42%) and temperature forecast (+39°C).', 'Evidence: OpenWeather API heatwave signal matched historical summer surge.') ON CONFLICT DO NOTHING;")

# 9. EXPENSES & DAILY BRIEFING
sql.append(f"INSERT INTO public.expenses (store_id, expense_category, title, amount, expense_date) VALUES ('{main_store_id}', 'Rent', 'Station Road Store Rent', 65000.00, CURRENT_DATE - INTERVAL '3 days') ON CONFLICT DO NOTHING;")
sql.append(f"INSERT INTO public.expenses (store_id, expense_category, title, amount, expense_date) VALUES ('{main_store_id}', 'Utilities', 'Adani Electricity Bill', 18500.00, CURRENT_DATE - INTERVAL '2 days') ON CONFLICT DO NOTHING;")

sql.append(f"INSERT INTO public.daily_briefs (store_id, brief_date, summary_text, top_products, risk_alerts) VALUES ('{main_store_id}', CURRENT_DATE, 'Good morning Jethalal ji! Today projected revenue is ₹48,500 (+15% vs last Friday). High demand expected for Amul Milk and Cold Drinks due to 37°C heatwave.', '[\"Amul Milk 500ml\", \"Coca-Cola 500ml\", \"Maggi Noodles\"]', '[\"Reorder Bisleri 1L - 8 units remaining\", \"Check Milk Batch #103 expiring in 4 days\"]') ON CONFLICT DO NOTHING;")

# Write out compact presentation seed file
out_file = "supabase/seed_presentation.sql"
with open(out_file, "w", encoding="utf-8") as f:
    f.write("\n".join(sql))

print(f"🎉 SUCCESS! Lightweight presentation seed created at '{out_file}' ({len('\n'.join(sql))} bytes, {len(sql)} statements).")
