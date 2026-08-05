-- Peer Intelligence (federated store network): store groups and the
-- request/offer marketplace between member stores.
--
-- These tables were previously documented only as a comment block in
-- src/app/api/federated-intelligence/route.ts and never created, so every
-- action on /dashboard/federated-intelligence failed.

CREATE TABLE IF NOT EXISTS store_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  city TEXT,
  state TEXT,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES store_groups(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  store_name TEXT NOT NULL,
  city TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, store_id)
);

CREATE TABLE IF NOT EXISTS product_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES store_groups(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  requester_store TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  quantity_needed INT NOT NULL,
  unit TEXT DEFAULT 'pcs',
  message TEXT,
  status TEXT DEFAULT 'open',
  fulfilled_by UUID,
  fulfiller_store TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_offers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES store_groups(id) ON DELETE CASCADE,
  offerer_id UUID NOT NULL,
  offerer_store TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  quantity_available INT NOT NULL,
  unit TEXT DEFAULT 'pcs',
  price FLOAT DEFAULT 0,
  message TEXT,
  status TEXT DEFAULT 'available',
  claimed_by UUID,
  claimer_store TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- The listing queries filter on these on every page load.
CREATE INDEX IF NOT EXISTS idx_group_members_store_id ON group_members(store_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_product_requests_group_id ON product_requests(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_offers_group_id ON product_offers(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_groups_invite_code ON store_groups(invite_code);

-- Matches the posture of the existing tables: the API routes use the anon
-- client with no session, so RLS would reject every insert. Re-enabling this
-- is tracked with the wider server-side auth work.
ALTER TABLE store_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_offers DISABLE ROW LEVEL SECURITY;
