CREATE TABLE IF NOT EXISTS responses (
  event TEXT NOT NULL, visitor TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('interested','going')),
  PRIMARY KEY(event,visitor)
);
CREATE TABLE IF NOT EXISTS referrals (
  event TEXT NOT NULL, visitor TEXT NOT NULL, inviter TEXT NOT NULL,
  PRIMARY KEY(event,visitor)
);
CREATE INDEX IF NOT EXISTS referrals_inviter ON referrals(inviter);

CREATE TABLE IF NOT EXISTS invitations (
  event TEXT NOT NULL, visitor TEXT NOT NULL,
  PRIMARY KEY(event,visitor)
);

CREATE TABLE IF NOT EXISTS event_clicks (
  event TEXT NOT NULL, visitor TEXT NOT NULL,
  clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(event,visitor)
);
