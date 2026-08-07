import json
import random
import datetime
import urllib.request
import ssl
import os
import uuid

ssl_context = ssl._create_unverified_context()

# Load .env.local
env_path = os.path.join(os.path.dirname(__file__), '../.env.local')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                parts = line.strip().split('=', 1)
                if len(parts) == 2:
                    os.environ[parts[0]] = parts[1]

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://pkpndbcldenbdkmybntb.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def post(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, context=ssl_context) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        if hasattr(e, 'read'):
            err = e.read().decode('utf-8')
            print(f"❌ Error inserting into {table}: {err[:200]}")
        else:
            print(f"❌ Error inserting into {table}: {e}")
        return None

def post_batch(table, items, batch_size=200):
    total = len(items)
    inserted = 0
    for i in range(0, total, batch_size):
        chunk = items[i:i+batch_size]
        res = post(table, chunk)
        if res:
            inserted += len(res) if isinstance(res, list) else 1
    print(f"✅ Table '{table}': {inserted}/{total} records inserted successfully.")
    return inserted

print("=========================================================================")
print("🚀 GADA RETAIL GROUP — ENTERPRISE PRODUCTION DUMMY DATA GENERATOR")
print("=========================================================================")

# 1. PRIMARY USER & ORGANIZATION SETUP
user_id = "00000000-0000-0000-0000-000000000001"

post("profiles", [{
    "id": user_id,
    "full_name": "Jethalal Champaklal Gada",
    "username": "jethalal_gada",
    "store_name": "Gada Electronics & General Store",
    "phone": "+91 98200 12345",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400077",
    "number_of_outlets": 5
}])

org_id = str(uuid.uuid4())
post("organizations", [{
    "id": org_id,
    "name": "Gada Retail Group",
    "slug": "gada-retail-group",
    "tax_id_gstin": "27AABCG1234F1Z5",
    "currency": "INR",
    "time_zone": "Asia/Kolkata",
    "plan": "enterprise",
    "subscription_status": "active",
    "max_stores": 10,
    "max_users": 50,
    "is_active": True
}])

stores_list = [
    {"id": str(uuid.uuid4()), "organization_id": org_id, "code": "GADA-GHATKOPAR-01", "name": "Gada Electronics & General Store", "store_type": "retail", "status": "ACTIVE", "address": "Gada House, Station Road, Ghatkopar East", "city": "Mumbai", "state": "Maharashtra", "pincode": "400077", "phone": "+91 98200 12345", "email": "jethalal@gadaretail.in", "gstin": "27AABCG1234F1Z5"},
    {"id": str(uuid.uuid4()), "organization_id": org_id, "code": "GADA-DADAR-02", "name": "Gada Retail - Dadar Branch", "store_type": "retail", "status": "ACTIVE", "address": "Ranade Road, Dadar West", "city": "Mumbai", "state": "Maharashtra", "pincode": "400028", "phone": "+91 98200 12346", "email": "dadar@gadaretail.in", "gstin": "27AABCG1234F2Z4"},
    {"id": str(uuid.uuid4()), "organization_id": org_id, "code": "GADA-BANDRA-03", "name": "Gada Retail - Bandra Express", "store_type": "retail", "status": "ACTIVE", "address": "Hill Road, Bandra West", "city": "Mumbai", "state": "Maharashtra", "pincode": "400050", "phone": "+91 98200 12347", "email": "bandra@gadaretail.in", "gstin": "27AABCG1234F3Z3"},
    {"id": str(uuid.uuid4()), "organization_id": org_id, "code": "GADA-THANE-04", "name": "Gada Retail - Thane Central Warehouse", "store_type": "warehouse", "status": "ACTIVE", "address": "Wagle Industrial Estate, Thane West", "city": "Mumbai Metro", "state": "Maharashtra", "pincode": "400604", "phone": "+91 98200 12348", "email": "warehouse@gadaretail.in", "gstin": "27AABCG1234F4Z2"},
    {"id": str(uuid.uuid4()), "organization_id": org_id, "code": "GADA-BORIVALI-05", "name": "Gada Retail - Borivali Kirana", "store_type": "retail", "status": "ACTIVE", "address": "SV Road, Borivali West", "city": "Mumbai", "state": "Maharashtra", "pincode": "400092", "phone": "+91 98200 12349", "email": "borivali@gadaretail.in", "gstin": "27AABCG1234F5Z1"}
]
post("stores", stores_list)
main_store_id = stores_list[0]["id"]
post("store_users", [{"store_id": main_store_id, "user_id": user_id, "role": "organization_owner"}])

# 2. 50 INDIAN SUPPLIERS
SUPPLIER_BRANDS = [
    ("Amul Dairy Distributors", "Anand, Gujarat"), ("Britannia FMCG Agencies", "Bhiwandi, Thane"),
    ("Parle Products Wholesalers", "Vile Parle, Mumbai"), ("Tata Consumer Products", "Lower Parel, Mumbai"),
    ("ITC Foods Division", "Andheri East, Mumbai"), ("Nestle India Supply Center", "Navi Mumbai"),
    ("Fortune Edible Oils", "Kandivali, Mumbai"), ("Hindustan Unilever Distribution", "Bhiwandi, Thane"),
    ("Haldiram Snacks Traders", "Nagpur / Bhiwandi"), ("Balaji Wafers Logistics", "Rajkot / Thane"),
    ("Coca-Cola Bottling Depot", "Thane West"), ("PepsiCo Beverage Supply", "Panvel, Navi Mumbai"),
    ("Bisleri International Hub", "Andheri East"), ("Everest Spices Wholesale", "Masjid Bunder, Mumbai"),
    ("MDH Spices Trade Center", "APMC Market, Vashi"), ("Dabur FMCG Distributors", "Bhiwandi, Thane"),
    ("Patanjali Ayurveda Supply", "Mumbai Depot"), ("Paper Boat Beverages", "Bengaluru / Thane"),
    ("Mother Dairy Supply", "Mumbai Depot"), ("Godrej Jersey Dairy", "Pune / Mumbai"),
    ("Nirma Detergents Wholesale", "Ahmedabad / Mumbai"), ("Gits Food Products", "Pune, Maharashtra"),
    ("MTR Foods Distribution", "Bengaluru / Mumbai"), ("Cadbury Mondelez Depot", "Thane, Maharashtra"),
    ("Ferrero India Supply", "Pune, Maharashtra"), ("Bector Foods Cremica", "Ludhiana / Mumbai"),
    ("Unibic Biscuits Hub", "Bengaluru / Mumbai"), ("Wagh Bakri Tea Center", "Ahmedabad / Mumbai"),
    ("Society Tea Distributors", "Masjid Bunder"), ("Red Label Unilever Center", "Bhiwandi"),
    ("Catch Spices Wholesalers", "APMC Vashi"), ("Badshah Masala Center", "Crawford Market"),
    ("Saffola Marico Logistics", "Bandra, Mumbai"), ("Dhara Oil Supply Depot", "Kandivali, Mumbai"),
    ("Gemini Edible Oils", "Solapur / Thane"), ("Pillsbury Atta Supply", "Navi Mumbai"),
    ("Aashirvaad ITC Depot", "Bhiwandi"), ("Vim & Surf Depot", "Bhiwandi"),
    ("Colgate Palmolive Logistics", "Powai, Mumbai"), ("Dettol Reckitt Benckiser", "Bhiwandi"),
    ("Sensodyne GSK Hub", "Mumbai"), ("Head & Shoulders P&G", "Andheri, Mumbai"),
    ("Clinic Plus Unilever", "Bhiwandi"), ("Godrej No 1 Soap Hub", "Vikhroli, Mumbai"),
    ("Wild Stone FMCG", "Mumbai"), ("Fogg Perfumes Depot", "Thane"),
    ("Pampers Procter Gamble", "Bhiwandi"), ("Huggies Kimberly Clark", "Pune / Mumbai"),
    ("Classmate ITC Stationery", "Bhiwandi"), ("Reynolds Pens Wholesalers", "Dadar, Mumbai")
]

supplier_records = []
supplier_ids = []
for i, (sname, sloc) in enumerate(SUPPLIER_BRANDS):
    sid = str(uuid.uuid4())
    supplier_ids.append(sid)
    supplier_records.append({
        "id": sid,
        "store_id": user_id,
        "name": sname,
        "contact_person": f"Rajesh {sname.split()[0]} Manager",
        "email": f"orders@{sname.lower().replace(' ', '')[:15]}.com",
        "phone": f"+91 98200 {10000 + i}",
        "address": f"Unit {i+10}, {sloc}",
        "lead_time_days": random.randint(1, 4),
        "payment_terms": random.choice(["NET_7", "NET_15", "NET_30", "COD"]),
        "rating": round(random.uniform(4.2, 4.9), 2),
        "gstin": f"27AAAAA{i+1000}A1Z5"
    })
post_batch("suppliers", supplier_records)

# 3. CATEGORIES & BRANDS
CATEGORIES = ["Dairy", "Beverages", "Snacks", "Groceries", "Personal Care", "Household", "Ice Cream", "Frozen Food", "Stationery", "Health"]
cat_ids = {}
cat_records = []
for cname in CATEGORIES:
    cid = str(uuid.uuid4())
    cat_ids[cname] = cid
    cat_records.append({"id": cid, "store_id": user_id, "name": cname, "code": cname[:3].upper()})
post_batch("categories", cat_records)

BRANDS = ["Amul", "Britannia", "Nestle", "Parle", "ITC", "Tata", "Aashirvaad", "Surf Excel", "Nirma", "Fortune", "Coca-Cola", "Pepsi", "Bisleri", "Paper Boat", "Patanjali", "MDH", "Everest", "Haldiram", "Balaji", "Lays", "Kurkure", "Dabur", "Cadbury", "Society Tea", "Colgate"]
brand_ids = {}
brand_records = []
for bname in BRANDS:
    bid = str(uuid.uuid4())
    brand_ids[bname] = bid
    brand_records.append({"id": bid, "store_id": user_id, "name": bname, "code": bname[:3].upper()})
post_batch("brands", brand_records)

print("✅ Setup complete: 50 Suppliers, 10 Categories, 25 Brands.")

