import urllib.request
import ssl
import os

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

print("Seeding Core Data from supabase/seed_gada_part1_core.sql...")
with open("supabase/seed_gada_part1_core.sql", "r", encoding="utf-8") as f:
    sql_lines = f.readlines()

print(f"Total SQL lines: {len(sql_lines)}")
print("Seed script is prepared and saved at 'supabase/seed_gada_part1_core.sql' and 'supabase/seed_gada_part2_sales.sql'")
