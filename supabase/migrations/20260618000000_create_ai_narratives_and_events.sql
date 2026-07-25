-- Create ai_narratives table
CREATE TABLE IF NOT EXISTS ai_narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  sales_story TEXT,
  future_expectation TEXT,
  recommendation TEXT,
  confidence_score NUMERIC
);

-- Create external_events table
CREATE TABLE IF NOT EXISTS external_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT,
  event_type TEXT,
  start_date DATE,
  end_date DATE,
  impact_score NUMERIC
);

-- Disable Row Level Security (RLS) on new tables to align with client settings
ALTER TABLE ai_narratives DISABLE ROW LEVEL SECURITY;
ALTER TABLE external_events DISABLE ROW LEVEL SECURITY;

-- Insert some default mock external events if table is empty
INSERT INTO external_events (event_name, event_type, start_date, end_date, impact_score)
VALUES
  ('Ganesh Festival', 'Festival', '2026-09-15', '2026-09-25', 0.9),
  ('Heatwave warning', 'Weather', '2026-06-20', '2026-06-25', 0.8),
  ('Heavy Rain Expected', 'Weather', '2026-06-28', '2026-07-05', 0.7),
  ('Diwali', 'Festival', '2026-11-05', '2026-11-12', 0.95)
ON CONFLICT DO NOTHING;
