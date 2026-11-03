CREATE TABLE IF NOT EXISTS partner_requests (
 id TEXT PRIMARY KEY, visitor TEXT NOT NULL, organization TEXT NOT NULL,
 title TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
 event_date TEXT NOT NULL, expires_on TEXT NOT NULL, contact_url TEXT NOT NULL,
 contact_email TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending'
 CHECK(status IN ('pending','approved','rejected','closed')),
 submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 review_notes TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS partner_status_expiry ON partner_requests(status,expires_on);
CREATE INDEX IF NOT EXISTS partner_visitor_date ON partner_requests(visitor,submitted_at);
CREATE TABLE IF NOT EXISTS notification_outbox (
 id TEXT PRIMARY KEY, subject TEXT NOT NULL, body TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER NOT NULL DEFAULT 0, last_error TEXT NOT NULL DEFAULT '',
 sent_at TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
