CREATE TABLE IF NOT EXISTS event_submissions (
  id TEXT PRIMARY KEY,
  visitor TEXT NOT NULL,
  title TEXT NOT NULL,
  organizer TEXT NOT NULL,
  event_date TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  review_notes TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS submissions_status_date ON event_submissions(status,submitted_at);
CREATE INDEX IF NOT EXISTS submissions_visitor_date ON event_submissions(visitor,submitted_at);
