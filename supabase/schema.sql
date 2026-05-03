-- Schema Minimal Login Generate (Supabase PostgreSQL)
-- Jalankan ini di SQL Editor Supabase Dashboard

CREATE TABLE IF NOT EXISTS links (
  subdomain VARCHAR(255) PRIMARY KEY,
  domain VARCHAR(255) NOT NULL,
  target_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  image_url TEXT
);

-- Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_links_subdomain ON links(subdomain);

-- Disable RLS untuk simplicity (atau enable jika mau)
-- ALTER TABLE links DISABLE ROW LEVEL SECURITY;
