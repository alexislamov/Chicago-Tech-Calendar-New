CREATE TABLE IF NOT EXISTS people_profiles (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL,
 bio TEXT NOT NULL, topics TEXT NOT NULL, ask_about TEXT NOT NULL, looking_for TEXT NOT NULL,
 linkedin TEXT NOT NULL, website TEXT NOT NULL DEFAULT '', open_to_meet INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'pending', review_note TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS people_linkedin ON people_profiles(linkedin);
CREATE TABLE IF NOT EXISTS people_appearances (
 id TEXT PRIMARY KEY, person TEXT NOT NULL, event TEXT NOT NULL, kind TEXT NOT NULL,
 source TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL,
 UNIQUE(person,event)
);
CREATE TABLE IF NOT EXISTS people_introductions (
 id TEXT PRIMARY KEY, sender TEXT NOT NULL, recipient TEXT NOT NULL, event TEXT NOT NULL,
 message TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', reply TEXT NOT NULL DEFAULT '',
 sender_followup INTEGER NOT NULL DEFAULT 0, recipient_followup INTEGER NOT NULL DEFAULT 0,
 sender_met INTEGER NOT NULL DEFAULT 0, recipient_met INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(sender,recipient,event)
);
CREATE TABLE IF NOT EXISTS people_blocks (blocker TEXT NOT NULL, blocked TEXT NOT NULL, PRIMARY KEY(blocker,blocked));
CREATE TABLE IF NOT EXISTS people_reports (id TEXT PRIMARY KEY, reporter TEXT NOT NULL, person TEXT NOT NULL, reason TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending');
CREATE TABLE IF NOT EXISTS people_usage (bucket TEXT PRIMARY KEY, used INTEGER NOT NULL, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS people_appearance_event ON people_appearances(event,status);
CREATE INDEX IF NOT EXISTS people_intro_recipient ON people_introductions(recipient,created_at);
