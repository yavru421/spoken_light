CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT,
  branding_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO tenants (id, name, subdomain, custom_domain, branding_json)
VALUES ('calvary', 'Calvary Baptist Church', 'calvary', 'spokenlight.dondlingergc.com', '{"tagline":"AV Soundboard Console","primaryColor":"#3b82f6"}');

CREATE INDEX IF NOT EXISTS idx_sermon_captions_sermon_id ON sermon_captions(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermon_scriptures_sermon_id ON sermon_scriptures(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermon_chapters_sermon_id ON sermon_chapters(sermon_id);
CREATE INDEX IF NOT EXISTS idx_sermons_created_at ON sermons(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sermons_tenant_id ON sermons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);
