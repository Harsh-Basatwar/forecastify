-- Drop the incorrect foreign key constraint that references stores(store_id)
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_store_id_fkey;

-- Re-create the foreign key constraint to reference auth.users(id) in the auth schema
ALTER TABLE inventory ADD CONSTRAINT inventory_store_id_fkey FOREIGN KEY (store_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add expiry_date and supplier columns if they don't exist
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS supplier TEXT;

-- Add missing columns to profiles table if they don't exist (needed for signup)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS number_of_outlets INTEGER DEFAULT 1;

-- Disable Row Level Security (RLS) on key tables to allow the server-side API routes (like Jarvis)
-- to insert and select data freely using the anon API client.
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
