-- Spoken Light Sermon Archive Schema (Multi-Tenant & White-Label)
-- Database: spoken_light_lexicon

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,               -- e.g. 'calvary', 'faith', 'grace'
  name TEXT NOT NULL,                -- e.g. 'Calvary Baptist Church'
  subdomain TEXT UNIQUE NOT NULL,    -- e.g. 'calvary', 'spokenlight'
  custom_domain TEXT,                -- e.g. 'calvary.spokenlight.app'
  branding_json TEXT,                -- JSON: { "logoUrl": "", "primaryColor": "#3b82f6", "tagline": "AV Soundboard Console" }
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sermons (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'calvary',
  title TEXT NOT NULL,
  speaker TEXT NOT NULL,
  service_date TEXT NOT NULL,
  summary TEXT,
  key_points TEXT,                   -- JSON array of strings
  duration_seconds INTEGER DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  wpm INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'recording', -- 'recording', 'processing', 'archived'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sermon_captions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL DEFAULT 'calvary',
  sermon_id TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  text TEXT NOT NULL,
  FOREIGN KEY (sermon_id) REFERENCES sermons(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sermon_scriptures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL DEFAULT 'calvary',
  sermon_id TEXT NOT NULL,
  reference TEXT NOT NULL,
  book TEXT,
  chapter INTEGER,
  verse INTEGER,
  detected_at_ms INTEGER NOT NULL,
  FOREIGN KEY (sermon_id) REFERENCES sermons(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sermon_chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL DEFAULT 'calvary',
  sermon_id TEXT NOT NULL,
  chapter_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  start_time_ms INTEGER NOT NULL,
  end_time_ms INTEGER,
  scripture_anchor TEXT,
  summary TEXT,
  FOREIGN KEY (sermon_id) REFERENCES sermons(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booth_users (
  username TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'calvary',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'calvary',
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS context (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theological_context TEXT NOT NULL,
  context_string TEXT
);

CREATE INDEX IF NOT EXISTS idx_sermon_captions_sermon_id ON sermon_captions(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermon_scriptures_sermon_id ON sermon_scriptures(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermon_chapters_sermon_id ON sermon_chapters(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermons_created_at ON sermons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sermons_tenant_id ON sermons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
