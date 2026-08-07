import json
import random
import datetime
import urllib.request
import urllib.parse
import os
import uuid

# Load .env.local
env_path = os.path.join(os.path.dirname(__file__), '../.env.local')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ[k] = v

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://pkpndbcldenbdkmybntb.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

print(f"Connecting to Supabase at: {SUPABASE_URL}")

def supabase_post(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        if hasattr(e, 'read'):
            print(f"Error posting to {table}:", e.read().decode('utf-8'))
        else:
            print(f"Error posting to {table}:", e)
        return None

print("Script template created successfully.")
