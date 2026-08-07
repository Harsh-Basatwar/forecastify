import json
import random
import datetime
import urllib.request
import ssl
import os
import uuid

# Disable SSL verification for script execution
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

def post_batch(table, items, batch_size=100):
    total = len(items)
    inserted = 0
    for i in range(0, total, batch_size):
        chunk = items[i:i+batch_size]
        res = post(table, chunk)
        if res:
            inserted += len(res) if isinstance(res, list) else 1
    print(f"✅ {table}: {inserted}/{total} records inserted successfully.")
    return inserted

print("🚀 Testing connection to Supabase...")
res = post("suppliers", [{"name": "Test Supplier", "phone": "+91 99999 99999"}])
print("Result:", res)
