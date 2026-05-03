-- Schema untuk Login Generate (Supabase PostgreSQL)
-- Jalankan ini di SQL Editor Supabase Dashboard

-- Buat tabel links
CREATE TABLE IF NOT EXISTS links (
  id SERIAL PRIMARY KEY,
  subdomain VARCHAR(255) UNIQUE NOT NULL,
  domain VARCHAR(255) NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT,
  target_url TEXT NOT NULL,
  offer_id VARCHAR(50) DEFAULT 'CUSTOM',
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buat index untuk performa
CREATE INDEX IF NOT EXISTS idx_links_subdomain ON links(subdomain);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at DESC);

-- Enable RLS (Row Level Security) - optional tapi direkomendasikan
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Buat policy untuk service role (full access)
CREATE POLICY "Service role full access" ON links
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Jika ingin public read access untuk data tertentu, uncomment:
-- CREATE POLICY "Public read" ON links
--   FOR SELECT
--   TO anon
--   USING (true);
