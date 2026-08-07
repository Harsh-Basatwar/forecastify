import os
import random
import datetime
import uuid

print("🚀 Generating Gada Retail Group Enterprise Master SQL Seed script...")

out_file = "supabase/seed_gada_retail.sql"

# Setup basic IDs
user_id = "00000000-0000-0000-0000-000000000001"
org_id = "11111111-1111-1111-1111-111111111111"
store_ids = [
    "22222222-2222-2222-2222-222222222221", # Main Ghatkopar
    "22222222-2222-2222-2222-222222222222", # Dadar
    "22222222-2222-2222-2222-222222222223", # Bandra
    "22222222-2222-2222-2222-222222222224", # Thane Warehouse
    "22222222-2222-2222-2222-222222222225"  # Borivali
]
main_store_id = store_ids[0]

sql = []
sql.append("-- ========================================================")
sql.append("-- GADA RETAIL GROUP ENTERPRISE MASTER SEED SCRIPT")
sql.append("-- Owner: Jethalal Champaklal Gada")
sql.append("-- Primary Store: Gada Electronics & General Store, Ghatkopar")
sql.append("-- Includes 500+ Products, 300+ Customers, 50 Suppliers, 18 Months Sales")
sql.append("-- ========================================================\n")

# 1. AUTH USER & PROFILE & ORGANIZATIONS
sql.append("-- 1. AUTH USER & PROFILES & ORG & STORES")
sql.append(f"""INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES ('{user_id}', '00000000-0000-0000-0000-000000000000', 'jethalal@gadaretail.in', '$2a$10$abcdefghijklmnopqrstuv', NOW(), '{{\"provider\":\"email\",\"providers\":[\"email\"]}}', '{{\"full_name\":\"Jethalal Champaklal Gada\"}}', NOW(), NOW(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;""")

sql.append(f"""INSERT INTO public.profiles (id, full_name, username, store_name, phone, city, state, pincode, number_of_outlets)
VALUES ('{user_id}', 'Jethalal Champaklal Gada', 'jethalal_gada', 'Gada Electronics & General Store', '+91 98200 12345', 'Mumbai', 'Maharashtra', '400077', 5)
ON CONFLICT (id) DO NOTHING;""")

sql.append(f"""INSERT INTO public.organizations (id, name, slug, tax_id_gstin, currency, time_zone, plan, subscription_status, max_stores, max_users, is_active)
VALUES ('{org_id}', 'Gada Retail Group', 'gada-retail-group', '27AABCG1234F1Z5', 'INR', 'Asia/Kolkata', 'enterprise', 'active', 10, 50, true)
ON CONFLICT (id) DO NOTHING;""")

stores_data = [
    (store_ids[0], "GADA-GHATKOPAR-01", "Gada Electronics & General Store", "retail", "Gada House, Station Road, Ghatkopar East", "400077", "+91 98200 12345", "27AABCG1234F1Z5"),
    (store_ids[1], "GADA-DADAR-02", "Gada Retail - Dadar Branch", "retail", "Ranade Road, Dadar West", "400028", "+91 98200 12346", "27AABCG1234F2Z4"),
    (store_ids[2], "GADA-BANDRA-03", "Gada Retail - Bandra Express", "retail", "Hill Road, Bandra West", "400050", "+91 98200 12347", "27AABCG1234F3Z3"),
    (store_ids[3], "GADA-THANE-04", "Gada Retail - Thane Central Warehouse", "warehouse", "Wagle Estate, Thane West", "400604", "+91 98200 12348", "27AABCG1234F4Z2"),
    (store_ids[4], "GADA-BORIVALI-05", "Gada Retail - Borivali Kirana", "retail", "SV Road, Borivali West", "400092", "+91 98200 12349", "27AABCG1234F5Z1")
]

for sid, code, name, stype, addr, pin, ph, gst in stores_data:
    sql.append(f"""INSERT INTO public.stores (id, organization_id, code, name, store_type, status, address, city, state, pincode, phone, gstin, owner_id)
VALUES ('{sid}', '{org_id}', '{code}', '{name}', '{stype}', 'ACTIVE', '{addr}', 'Mumbai', 'Maharashtra', '{pin}', '{ph}', '{gst}', '{user_id}')
ON CONFLICT (id) DO NOTHING;""")
    sql.append(f"""INSERT INTO public.store_users (store_id, user_id, role) VALUES ('{sid}', '{user_id}', 'organization_owner') ON CONFLICT DO NOTHING;""")

sql.append("\n-- 2. 50 SUPPLIERS")
SUPPLIERS = [
    ("Amul Dairy Distributors", "Anand, Gujarat", "27AAAAA0000A1Z5"),
    ("Britannia FMCG Agencies", "Bhiwandi, Thane", "27BBBBB1111B1Z4"),
    ("Parle Products Wholesalers", "Vile Parle, Mumbai", "27CCCCC2222C1Z3"),
    ("Tata Consumer Products", "Lower Parel, Mumbai", "27DDDDD3333D1Z2"),
    ("ITC Foods Division Depot", "Andheri East, Mumbai", "27EEEEE4444E1Z1"),
    ("Nestle India Supply Center", "Navi Mumbai", "27FFFFF5555F1Z0"),
    ("Fortune Edible Oils Logistics", "Kandivali, Mumbai", "27GGGGG6666G1Z9"),
    ("Hindustan Unilever Distribution", "Bhiwandi, Thane", "27HHHHH7777H1Z8"),
    ("Haldiram Snacks Traders", "Nagpur / Bhiwandi", "27IIIII8888I1Z7"),
    ("Balaji Wafers Logistics", "Rajkot / Thane", "27JJJJJ9999J1Z6"),
    ("Coca-Cola Bottling Depot", "Thane West", "27KKKKK0000K1Z5"),
    ("PepsiCo Beverage Supply", "Panvel, Navi Mumbai", "27LLLLL1111L1Z4"),
    ("Bisleri International Hub", "Andheri East", "27MMMMM2222M1Z3"),
    ("Everest Spices Wholesale", "Masjid Bunder", "27NNNNN3333N1Z2"),
    ("MDH Spices Trade Center", "APMC Market Vashi", "27OOOOO4444O1Z1"),
    ("Dabur FMCG Distributors", "Bhiwandi, Thane", "27PPPPP5555P1Z0"),
    ("Patanjali Ayurveda Supply", "Mumbai Depot", "27QQQQQ6666Q1Z9"),
    ("Paper Boat Beverages Center", "Bhiwandi, Thane", "27RRRRR7777R1Z8"),
    ("Mother Dairy Supply Hub", "Mumbai Depot", "27SSSSS8888S1Z7"),
    ("Godrej Jersey Dairy", "Pune / Mumbai", "27TTTTT9999T1Z6"),
    ("Nirma Detergents Wholesale", "Ahmedabad / Mumbai", "27UUUUU0000U1Z5"),
    ("Gits Food Products", "Pune, Maharashtra", "27VVVVV1111V1Z4"),
    ("MTR Foods Distribution", "Bengaluru / Mumbai", "27WWWWW2222W1Z3"),
    ("Cadbury Mondelez Depot", "Thane, Maharashtra", "27XXXXX3333X1Z2"),
    ("Ferrero India Supply", "Pune, Maharashtra", "27YYYYY4444Y1Z1"),
    ("Bector Foods Cremica", "Ludhiana / Mumbai", "27ZZZZZ5555Z1Z0"),
    ("Unibic Biscuits Hub", "Bengaluru / Mumbai", "27AAAAA6666A1Z9"),
    ("Wagh Bakri Tea Center", "Ahmedabad / Mumbai", "27BBBBB7777B1Z8"),
    ("Society Tea Distributors", "Masjid Bunder", "27CCCCC8888C1Z7"),
    ("Red Label Unilever Center", "Bhiwandi, Thane", "27DDDDD9999D1Z6"),
    ("Catch Spices Wholesalers", "APMC Vashi", "27EEEEE0000E1Z5"),
    ("Badshah Masala Center", "Crawford Market", "27FFFFF1111F1Z4"),
    ("Saffola Marico Logistics", "Bandra, Mumbai", "27GGGGG2222G1Z3"),
    ("Dhara Oil Supply Depot", "Kandivali, Mumbai", "27HHHHH3333H1Z2"),
    ("Gemini Edible Oils", "Solapur / Thane", "27IIIII4444I1Z1"),
    ("Pillsbury Atta Supply", "Navi Mumbai", "27JJJJJ5555J1Z0"),
    ("Aashirvaad ITC Depot", "Bhiwandi, Thane", "27KKKKK6666K1Z9"),
    ("Vim & Surf Depot", "Bhiwandi, Thane", "27LLLLL7777L1Z8"),
    ("Colgate Palmolive Logistics", "Powai, Mumbai", "27MMMMM8888M1Z7"),
    ("Dettol Reckitt Benckiser", "Bhiwandi, Thane", "27NNNNN9999N1Z6"),
    ("Sensodyne GSK Hub", "Mumbai", "27OOOOO0000O1Z5"),
    ("Head & Shoulders P&G", "Andheri, Mumbai", "27PPPPP1111P1Z4"),
    ("Clinic Plus Unilever", "Bhiwandi, Thane", "27QQQQQ2222Q1Z3"),
    ("Godrej No 1 Soap Hub", "Vikhroli, Mumbai", "27RRRRR3333R1Z2"),
    ("Wild Stone FMCG", "Mumbai", "27SSSSS4444S1Z1"),
    ("Fogg Perfumes Depot", "Thane", "27TTTTT5555T1Z0"),
    ("Pampers Procter Gamble", "Bhiwandi, Thane", "27UUUUU6666U1Z9"),
    ("Huggies Kimberly Clark", "Pune / Mumbai", "27VVVVV7777V1Z8"),
    ("Classmate ITC Stationery", "Bhiwandi, Thane", "27WWWWW8888W1Z7"),
    ("Reynolds Pens Wholesalers", "Dadar, Mumbai", "27XXXXX9999X1Z6")
]

supplier_ids = []
for i, (sname, sloc, gstin) in enumerate(SUPPLIERS):
    sid = f"33333333-3333-3333-3333-{i+1:012d}"
    supplier_ids.append(sid)
    sql.append(f"""INSERT INTO public.suppliers (id, store_id, name, contact_person, email, phone, address, lead_time_days, payment_terms, rating, gstin)
VALUES ('{sid}', '{user_id}', '{sname}', 'Rajesh Manager', 'orders@{sname.lower().replace(" ", "")[:12]}.com', '+91 98200 {10000+i}', '{sloc}', {random.randint(1,4)}, 'Net 30', {round(random.uniform(4.2,4.9),2)}, '{gstin}')
ON CONFLICT (id) DO NOTHING;""")

print("✅ Added Users, Org, 5 Stores, 50 Suppliers.")


# 3. 500 PRODUCTS, VARIANTS & BATCHES
sql.append("\n-- 3. 500 PRODUCTS & INVENTORY BATCHES")

CATEGORIES_LIST = [
    ("Dairy", 0.05), ("Beverages", 0.12), ("Snacks", 0.12), ("Groceries", 0.05),
    ("Personal Care", 0.18), ("Household", 0.18), ("Ice Cream", 0.18),
    ("Frozen Food", 0.12), ("Stationery", 0.12), ("Health", 0.12)
]

BRANDS_LIST = ["Amul", "Britannia", "Nestle", "Parle", "ITC", "Tata", "Aashirvaad", "Surf Excel", "Nirma", "Fortune", "Coca-Cola", "Pepsi", "Bisleri", "Paper Boat", "Patanjali", "MDH", "Everest", "Haldiram", "Balaji", "Lays", "Kurkure", "Dabur", "Cadbury", "Society Tea", "Colgate"]

cat_ids = {}
for i, (cname, gst) in enumerate(CATEGORIES_LIST):
    cid = f"44444444-4444-4444-4444-{i+1:012d}"
    cat_ids[cname] = cid
    sql.append(f"""INSERT INTO public.categories (id, store_id, name, description) VALUES ('{cid}', '{user_id}', '{cname}', '{cname} Products') ON CONFLICT (id) DO NOTHING;""")

brand_ids = {}
for i, bname in enumerate(BRANDS_LIST):
    bid = f"55555555-5555-5555-5555-{i+1:012d}"
    brand_ids[bname] = bid
    sql.append(f"""INSERT INTO public.brands (id, store_id, name, description) VALUES ('{bid}', '{user_id}', '{bname}', '{bname} Brand') ON CONFLICT (id) DO NOTHING;""")

PRODUCT_TEMPLATES = [
    ("Amul Taaza Toned Milk 500ml", "Dairy", "Amul", 30, 26, "500ml", 5),
    ("Amul Gold Full Cream Milk 1L", "Dairy", "Amul", 66, 58, "1L", 5),
    ("Amul Butter 100g", "Dairy", "Amul", 56, 48, "100g", 30),
    ("Amul Masti Dahi 400g", "Dairy", "Amul", 35, 29, "400g", 7),
    ("Amul Processed Cheese Slices 200g", "Dairy", "Amul", 140, 118, "200g", 90),
    ("Amul Paneer Fresh 200g", "Dairy", "Amul", 95, 78, "200g", 15),
    ("Amul Lassi 200ml Tetra Pack", "Dairy", "Amul", 20, 15, "200ml", 60),
    ("Amul Kool Chocolate Milk 180ml", "Beverages", "Amul", 30, 23, "180ml", 90),
    ("Britannia Good Day Butter Biscuits 120g", "Snacks", "Britannia", 30, 24, "120g", 180),
    ("Britannia Bourbon Chocolate Biscuits 150g", "Snacks", "Britannia", 35, 28, "150g", 180),
    ("Britannia Marie Gold 250g", "Snacks", "Britannia", 40, 32, "250g", 180),
    ("Britannia Milk Bikis 100g", "Snacks", "Britannia", 20, 15, "100g", 180),
    ("Britannia NutriChoice Digestive 100g", "Snacks", "Britannia", 30, 23, "100g", 180),
    ("Britannia Daily Fresh Dahi 400g", "Dairy", "Britannia", 40, 32, "400g", 8),
    ("Nestle Maggi 2-Min Masala Noodles 280g Pack of 4", "Snacks", "Nestle", 56, 46, "280g", 240),
    ("Nestle EveryDay Dairy Whitener 200g", "Dairy", "Nestle", 125, 102, "200g", 240),
    ("Nestle Nescafe Classic Instant Coffee 50g Glass Jar", "Beverages", "Nestle", 195, 160, "50g", 365),
    ("Nestle KitKat 4-Finger Chocolate 38g", "Snacks", "Nestle", 40, 31, "38g", 270),
    ("Nestle Munch Chocolate 18g", "Snacks", "Nestle", 10, 7.5, "18g", 270),
    ("Parle-G Glucose Biscuits 80g", "Snacks", "Parle", 10, 7.8, "80g", 180),
    ("Parle Monaco Salted Biscuits 120g", "Snacks", "Parle", 20, 15.5, "120g", 180),
    ("Parle Krackjack Sweet & Salty 120g", "Snacks", "Parle", 20, 15.5, "120g", 180),
    ("Parle Hide & Seek Chocolate Chip Biscuits 100g", "Snacks", "Parle", 35, 27, "100g", 180),
    ("ITC Sunfeast Dark Fantasy Choco Fills 75g", "Snacks", "ITC", 45, 35, "75g", 180),
    ("ITC Sunfeast Mom's Magic Cashew Biscuit 100g", "Snacks", "ITC", 30, 23, "100g", 180),
    ("Aashirvaad Shudh Chakki Atta 5kg", "Groceries", "Aashirvaad", 280, 235, "5kg", 120),
    ("Aashirvaad Select Premium Sharbati Atta 5kg", "Groceries", "Aashirvaad", 340, 285, "5kg", 120),
    ("Aashirvaad Salt 1kg Pack", "Groceries", "Aashirvaad", 25, 19, "1kg", 365),
    ("Tata Tea Gold Premium Black Tea 250g", "Beverages", "Tata", 140, 112, "250g", 365),
    ("Tata Tea Premium Country's Tea 250g", "Beverages", "Tata", 125, 98, "250g", 365),
    ("Tata Salt Iodized 1kg", "Groceries", "Tata", 28, 22, "1kg", 365),
    ("Tata Sampann Toor Dal 1kg", "Groceries", "Tata", 165, 138, "1kg", 180),
    ("Tata Sampann Chana Dal 1kg", "Groceries", "Tata", 115, 92, "1kg", 180),
    ("Surf Excel Easy Wash Detergent Powder 1kg", "Household", "Surf Excel", 140, 115, "1kg", 730),
    ("Surf Excel Matic Front Load Powder 1kg", "Household", "Surf Excel", 240, 195, "1kg", 730),
    ("Nirma Wash Powder 1kg", "Household", "Nirma", 65, 52, "1kg", 730),
    ("Nirma Beauty Soap 100g Pack of 3", "Personal Care", "Nirma", 75, 58, "300g", 730),
    ("Fortune Sunlite Refined Sunflower Oil 1L Pouch", "Groceries", "Fortune", 145, 122, "1L", 180),
    ("Fortune Kachi Ghani Mustard Oil 1L Bottle", "Groceries", "Fortune", 165, 138, "1L", 180),
    ("Coca-Cola Original Taste 500ml Bottle", "Beverages", "Coca-Cola", 40, 31, "500ml", 120),
    ("Coca-Cola 1.25L Bottle", "Beverages", "Coca-Cola", 65, 50, "1.25L", 120),
    ("Thums Up Strong Taste 500ml", "Beverages", "Coca-Cola", 40, 31, "500ml", 120),
    ("Sprite Lemon Lime Soda 500ml", "Beverages", "Coca-Cola", 40, 31, "500ml", 120),
    ("Pepsi Regular 500ml Pet Bottle", "Beverages", "Pepsi", 40, 31, "500ml", 120),
    ("7Up Lemon Soda 500ml", "Beverages", "Pepsi", 40, 31, "500ml", 120),
    ("Mirinda Orange Soft Drink 500ml", "Beverages", "Pepsi", 40, 31, "500ml", 120),
    ("Bisleri Mineral Water 1L Bottle", "Beverages", "Bisleri", 20, 14, "1L", 180),
    ("Bisleri Mineral Water 5L Can", "Beverages", "Bisleri", 75, 55, "5L", 180),
    ("Paper Boat Aamras Mango Juice 250ml", "Beverages", "Paper Boat", 35, 26, "250ml", 120),
    ("Paper Boat Anardana Juice 250ml", "Beverages", "Paper Boat", 35, 26, "250ml", 120),
    ("Patanjali Dant Kanti Toothpaste 100g", "Personal Care", "Patanjali", 60, 47, "100g", 365),
    ("Patanjali Pure Honey 500g Glass Jar", "Groceries", "Patanjali", 195, 155, "500g", 365),
    ("Everest Tikhalal Chili Powder 100g", "Groceries", "Everest", 55, 42, "100g", 365),
    ("Everest Garam Masala 100g", "Groceries", "Everest", 90, 71, "100g", 365),
    ("MDH Chana Masala 100g", "Groceries", "MDH", 85, 66, "100g", 365),
    ("MDH Kitchen King Masala 100g", "Groceries", "MDH", 88, 68, "100g", 365),
    ("Haldiram Nagpur Aloo Bhujia 200g", "Snacks", "Haldiram", 55, 43, "200g", 180),
    ("Haldiram Khatta Meetha Namkeen 200g", "Snacks", "Haldiram", 55, 43, "200g", 180),
    ("Balaji Wafers Simply Salted 50g", "Snacks", "Balaji", 20, 15, "50g", 120),
    ("Balaji Masala Masti Chips 50g", "Snacks", "Balaji", 20, 15, "50g", 120),
    ("Lays Spanish Tomato Tango 30g", "Snacks", "Lays", 10, 7.8, "30g", 120),
    ("Lays Magic Masala Chips 50g", "Snacks", "Lays", 20, 15.5, "50g", 120),
    ("Kurkure Masala Munch 45g", "Snacks", "Kurkure", 10, 7.8, "45g", 120),
    ("Dabur Red Toothpaste 200g", "Personal Care", "Dabur", 115, 91, "200g", 365),
    ("Cadbury Dairy Milk Silk 60g", "Snacks", "Cadbury", 80, 63, "60g", 270),
    ("Society Leaf Tea 250g Box", "Beverages", "Society Tea", 135, 106, "250g", 365),
    ("Colgate Strong Teeth Toothpaste 200g", "Personal Care", "Colgate", 110, 86, "200g", 365)
]

# Expand to 500 product variations dynamically
product_ids = []
batch_ids = []

for idx in range(500):
    pid = f"66666666-6666-6666-6666-{idx+1:012d}"
    product_ids.append(pid)
    
    tmpl = PRODUCT_TEMPLATES[idx % len(PRODUCT_TEMPLATES)]
    pname = f"{tmpl[0]} (Batch-{idx+101})" if idx >= len(PRODUCT_TEMPLATES) else tmpl[0]
    cat_name = tmpl[1]
    brand_name = tmpl[2]
    mrp = tmpl[3] + (idx // len(PRODUCT_TEMPLATES))*5
    cost_price = tmpl[4] + (idx // len(PRODUCT_TEMPLATES))*4
    selling_price = round(mrp * 0.95, 2)
    unit = tmpl[5]
    shelf_life = tmpl[6]
    gst_rate = 0.05 if cat_name in ["Dairy", "Groceries"] else (0.18 if cat_name in ["Personal Care", "Household"] else 0.12)
    supplier_id = supplier_ids[idx % len(supplier_ids)]
    sku = f"SKU-GADA-{idx+1001}"
    barcode = f"8901058{idx+100001:06d}"
    aisle = f"Aisle {(idx%5)+1} - Rack {chr(65 + (idx%4))}"

    sql.append(f"""INSERT INTO public.products (id, store_id, name, sku, barcode, category_id, brand_id, mrp, cost_price, selling_price, unit, gst_rate, reorder_level, safety_stock, shelf_location, supplier_id)
VALUES ('{pid}', '{main_store_id}', '{pname}', '{sku}', '{barcode}', '{cat_ids[cat_name]}', '{brand_ids[brand_name]}', {mrp}, {cost_price}, {selling_price}, '{unit}', {gst_rate}, {random.randint(10,30)}, {random.randint(5,15)}, '{aisle}', '{supplier_id}')
ON CONFLICT (id) DO NOTHING;""")

    # Inventory Record
    sql.append(f"""INSERT INTO public.inventory (id, store_id, product_id, product_name, name, category, quantity, price, cost_price, unit, reorder_level, supplier)
VALUES ('{pid}', '{main_store_id}', '{pid}', '{pname}', '{pname}', '{cat_name}', {random.randint(15, 120)}, {selling_price}, {cost_price}, '{unit}', 15, '{supplier_ids[idx%len(supplier_ids)]}')
ON CONFLICT (id) DO NOTHING;""")

    # Product Batches (FEFO expiry tracking)
    bid = f"77777777-7777-7777-7777-{idx+1:012d}"
    batch_ids.append(bid)
    mfg = datetime.date.today() - datetime.timedelta(days=random.randint(10, 60))
    exp = mfg + datetime.timedelta(days=shelf_life)
    sql.append(f"""INSERT INTO public.product_batches (id, product_id, batch_number, mfg_date, expiry_date, quantity, purchase_price)
VALUES ('{bid}', '{pid}', 'BATCH-2026-{idx+500}', '{mfg}', '{exp}', {random.randint(20, 100)}, {cost_price})
ON CONFLICT (id) DO NOTHING;""")

print("✅ Added 500 Products, Categories, Brands, Inventory rows, and Batches.")


# 4. 300+ CUSTOMERS & 100+ KHATA ACCOUNTS
sql.append("\n-- 4. 300 CUSTOMERS & KHATA ACCOUNTS")

INDIAN_CUSTOMER_NAMES = [
    "Champaklal Jayantilal Gada", "Babita Krishnan Iyer", "Subrahmaniam Krishnan Iyer", "Taarak Janubhai Mehta",
    "Aatmaram Tukaram Bhide", "Roshan Singh Sodhi", "Dr. Hansraj Hathi", "Popatlal Pandey", "Sundar Lal",
    "Abdul Latif Bhai", "Rita Reporter", "Natwarlal Prabhashankar Joshi (Natu Kaka)", "Bagheshwar Dukhichakra (Bagha)",
    "Daya Jethalal Gada", "Tipendra Jethalal Gada (Tapu)", "Anjali Taarak Mehta", "Madhavi Aatmaram Bhide",
    "Komal Hansraj Hathi", "Roshan Kaur Sodhi", "Pankaj Sahai (Pinku)", "Gulabkumar Hathi (Goli)",
    "Gurucharan Singh Sodhi (Gugi)", "Sonalika Aatmaram Bhide (Sonu)", "Bhogilal Shah", "Jevanalal Patel",
    "Ghanshyam Bhai", "Navneet Parekh", "Kishore Kumar", "Ramesh Chawla", "Suresh Deshmukh", "Vijay Kulkarni",
    "Mahesh Joshi", "Prakash Shetty", "Anand Rao", "Sanjay Patil", "Dinesh Nair", "Rajesh Pillai", "Sunil Sawant",
    "Manoj Shinde", "Ashok Gawde", "Nitin Pawar", "Deepak Thorat", "Sachin Kadam", "Rahul Mane", "Vikram Chitre"
]

customer_ids = []
khata_customer_ids = []

for i in range(300):
    cid = f"88888888-8888-8888-8888-{i+1:012d}"
    customer_ids.append(cid)
    
    if i < len(INDIAN_CUSTOMER_NAMES):
        cname = INDIAN_CUSTOMER_NAMES[i]
    else:
        cname = f"Customer {i+1} ({random.choice(['Patel', 'Shah', 'Mehta', 'Joshi', 'Sharma', 'Gupta', 'Verma', 'Singh', 'Deshmukh', 'Kulkarni', 'Patil', 'Shetty', 'Pillai', 'Nair'])})"
    
    phone = f"+91 98201 {10000+i}"
    ctype = "VIP" if i < 15 else ("Regular" if i < 120 else "Occasional")
    lpoints = random.randint(100, 4500) if ctype != "Occasional" else random.randint(0, 200)
    address = f"Flat {random.randint(101,904)}, Gokuldham Society, Powder Gali, Ghatkopar East, Mumbai" if i < 30 else f"Building {random.randint(1,40)}, Road {random.randint(1,15)}, Ghatkopar East, Mumbai"
    
    sql.append(f"""INSERT INTO public.customers (id, name, phone, email, address, loyalty_points, customer_type)
VALUES ('{cid}', '{cname}', '{phone}', 'customer{i+1}@gmail.com', '{address}', {lpoints}, '{ctype}')
ON CONFLICT (id) DO NOTHING;""")

    # 100 Khata Credit Customers
    if i < 100:
        khata_customer_ids.append(cid)
        kid = f"99999999-9999-9999-9999-{i+1:012d}"
        balance = round(random.uniform(250, 4500), 2) if i < 75 else 0.00
        sql.append(f"""INSERT INTO public.khata_accounts (id, customer_id, store_id, current_balance, credit_limit, status)
VALUES ('{kid}', '{cid}', '{main_store_id}', {balance}, 10000.00, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;""")
        if balance > 0:
            sql.append(f"""INSERT INTO public.khata_transactions (khata_account_id, store_id, transaction_type, amount, balance_after, notes)
VALUES ('{kid}', '{main_store_id}', 'DEBIT', {balance}, {balance}, 'Weekly groceries credit balance')
ON CONFLICT DO NOTHING;""")

print("✅ Added 300 Customers & 100 Khata Credit Accounts.")

# 5. 18 MONTHS HISTORICAL SALES & POS TRANSACTIONS (25,000+ SALE ITEMS)
sql.append("\n-- 5. 18 MONTHS HISTORICAL SALES TRANSACTIONS (25,000+ ITEMS)")

start_date = datetime.date.today() - datetime.timedelta(days=540)
invoice_seq = 10001
total_sale_items = 0

for day in range(540):
    curr_date = start_date + datetime.timedelta(days=day)
    day_name = curr_date.strftime("%A")
    month = curr_date.month

    # Seasonal volume multiplier
    base_orders = random.randint(12, 22)
    if day_name in ["Saturday", "Sunday"]:
        base_orders = int(base_orders * 1.5)
    if month in [10, 11]: # Diwali / Navratri peak
        base_orders = int(base_orders * 2.2)
    elif month in [3]: # Holi festival surge
        base_orders = int(base_orders * 1.8)
    elif month in [5, 6]: # Summer heatwave beverages
        base_orders = int(base_orders * 1.4)
    elif month in [7, 8]: # Monsoon tea/noodles surge
        base_orders = int(base_orders * 1.3)

    for order in range(base_orders):
        sale_id = str(uuid.uuid4())
        inv_no = f"INV-2025-{invoice_seq}"
        invoice_seq += 1

        cust_id = random.choice(customer_ids)
        pay_method = random.choice(["UPI_GPAY", "UPI_PHONEPE", "CASH", "CREDIT_CARD", "KHATA_CREDIT"])
        
        # Select 2 to 6 items per transaction
        num_items = random.randint(2, 6)
        chosen_p_indices = random.sample(range(500), num_items)

        subtotal = 0.0
        tax_total = 0.0
        sale_items_sqls = []

        for pidx in chosen_p_indices:
            pid = product_ids[pidx]
            bid = batch_ids[pidx]
            qty = random.randint(1, 4)
            unit_p = round(random.uniform(20.0, 150.0), 2)
            line_tot = round(unit_p * qty, 2)
            subtotal += line_tot
            tax_total += round(line_tot * 0.05, 2)
            total_sale_items += 1
            
            si_id = str(uuid.uuid4())
            sale_items_sqls.append(f"""INSERT INTO public.sale_items (id, sale_id, product_id, batch_id, unit_price, quantity, total_price)
VALUES ('{si_id}', '{sale_id}', '{pid}', '{bid}', {unit_p}, {qty}, {line_tot});""")

        discount = round(subtotal * 0.05, 2) if subtotal > 500 else 0.0
        grand_total = round(subtotal + tax_total - discount, 2)

        # Sales Header
        sql.append(f"""INSERT INTO public.sales (id, store_id, customer_id, invoice_number, subtotal, tax_amount, discount_amount, grand_total, payment_method, created_at)
VALUES ('{sale_id}', '{main_store_id}', '{cust_id}', '{inv_no}', {subtotal}, {tax_total}, {discount}, {grand_total}, '{pay_method}', '{curr_date} 14:30:00');""")
        
        sql.extend(sale_items_sqls)

print(f"✅ Generated 18 months of historical POS sales ({invoice_seq-10001} invoices, {total_sale_items} sale line items).")

# 6. PURCHASE ORDERS & GRN
sql.append("\n-- 6. PURCHASE ORDERS & GOODS RECEIVED NOTES")
for po_idx in range(40):
    po_id = str(uuid.uuid4())
    supplier_id = random.choice(supplier_ids)
    po_no = f"PO-GADA-2026-{101+po_idx}"
    po_date = datetime.date.today() - datetime.timedelta(days=random.randint(5, 120))
    status = random.choice(["COMPLETED", "APPROVED", "PARTIAL_RECEIVED", "IN_TRANSIT", "CANCELLED"])
    tot_val = round(random.uniform(15000.0, 85000.0), 2)
    
    sql.append(f"""INSERT INTO public.purchase_orders (id, order_number, store_id, supplier_id, order_date, expected_delivery_date, total_amount, status)
VALUES ('{po_id}', '{po_no}', '{main_store_id}', '{supplier_id}', '{po_date}', '{po_date + datetime.timedelta(days=3)}', {tot_val}, '{status}')
ON CONFLICT (id) DO NOTHING;""")

# 7. FORECAST ENGINE & WEATHER TELEMETRY
sql.append("\n-- 7. AI DEMAND FORECAST PREDICTIONS & WEATHER TELEMETRY")
for pidx in range(100):
    pid = product_ids[pidx]
    for day_offset in range(14):
        fdate = datetime.date.today() + datetime.timedelta(days=day_offset)
        base_demand = random.randint(15, 60)
        weather_mult = round(random.uniform(1.1, 1.8), 2) if pidx < 30 else 1.0
        predicted = int(base_demand * weather_mult)
        
        sql.append(f"""INSERT INTO public.forecast_predictions (id, store_id, product_id, forecast_date, predicted_demand, confidence_lower, confidence_upper, weather_impact_multiplier)
VALUES ('{str(uuid.uuid4())}', '{main_store_id}', '{pid}', '{fdate}', {predicted}, {int(predicted*0.85)}, {int(predicted*1.2)}, {weather_mult})
ON CONFLICT DO NOTHING;""")

# 8. AI RECOMMENDATIONS & EXPLAINABILITY EVIDENCE
sql.append("\n-- 8. AI RECOMMENDATIONS & EXPLAINABILITY ENGINE")
REC_TYPES = [
    ("REORDER_SOON", "Reorder Urgent: High Surge Expected", "OpenWeather detects temperature rise to 39°C. Reorder 60 units of Cold Beverages before Friday."),
    ("DISCOUNT_NEAR_EXPIRY", "Discount 25%: Batch Expiring", "Batch #402 expiring in 5 days. Apply 25% clearance discount to prevent expiry waste loss."),
    ("STOCK_TRANSFER", "Transfer Stock from Thane Warehouse", "Bandra branch experiencing unexpected demand spike. Transfer 40 units from Thane Central Warehouse."),
    ("CROSS_SELL_PROMO", "Bundle Promo: Tea + Biscuits", "Historical market basket analysis shows 68% co-purchase rate between Tata Tea and Parle-G.")
]

for ridx, (rtype, rtitle, rdesc) in enumerate(REC_TYPES):
    rec_id = str(uuid.uuid4())
    pid = product_ids[ridx * 5]
    sql.append(f"""INSERT INTO public.forecast_recommendations (id, store_id, product_id, recommendation_type, title, description, impact_score, status)
VALUES ('{rec_id}', '{main_store_id}', '{pid}', '{rtype}', '{rtitle}', '{rdesc}', {round(random.uniform(8.5, 9.8), 1)}, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;""")
    
    sql.append(f"""INSERT INTO public.explanation_records (id, recommendation_id, explanation_text, evidence_summary)
VALUES ('{str(uuid.uuid4())}', '{rec_id}', 'AI Model evaluated historical velocity (+42%), temperature forecast (+38°C), and local festival calendar.', 'Evidence: OpenWeather API signal matched 3-year historical summer surge pattern.')
ON CONFLICT (id) DO NOTHING;""")

# 9. EXPENSES & DAILY AI BRIEFINGS
sql.append("\n-- 9. EXPENSES & DAILY AI BRIEFINGS")
EXPENSE_ITEMS = [
    ("Store Rent - Station Road Ghatkopar", 65000.00, "Rent"),
    ("Electricity Bill - Adani Electricity", 18500.00, "Utilities"),
    ("Staff Salary - Manager & Billing Cashiers", 85000.00, "Salaries"),
    ("Packaging Supplies & Carry Bags", 4500.00, "Supplies"),
    ("Store Maintenance & AC Servicing", 6000.00, "Maintenance")
]

for exp_title, exp_amt, exp_cat in EXPENSE_ITEMS:
    sql.append(f"""INSERT INTO public.expenses (store_id, expense_category, title, amount, expense_date)
VALUES ('{main_store_id}', '{exp_cat}', '{exp_title}', {exp_amt}, CURRENT_DATE - INTERVAL '5 days')
ON CONFLICT DO NOTHING;""")

sql.append(f"""INSERT INTO public.daily_briefs (store_id, brief_date, summary_text, top_products, risk_alerts)
VALUES ('{main_store_id}', CURRENT_DATE, 'Good morning Jethalal ji! Today projected revenue is ₹48,500 (+15% vs last Friday). High demand expected for Amul Milk and Cold Drinks due to 37°C heatwave.', '["Amul Milk 500ml", "Coca-Cola 500ml", "Lays Chips"]', '["Reorder Bisleri 1L - 8 units remaining", "Check Milk Batch #402 expiring in 4 days"]')
ON CONFLICT DO NOTHING;""")

# Save master SQL script
with open(out_file, "w", encoding="utf-8") as f:
    f.write("\n".join(sql))

print(f"\n🎉 SUCCESS! Generated Master Enterprise Seed SQL at '{out_file}'.")
print(f"Total SQL script size: {len('\n'.join(sql))} bytes across {len(sql)} DDL/DML statements.")

