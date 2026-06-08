CREATE TABLE IF NOT EXISTS profiles (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  passcode    TEXT NOT NULL,
  color       TEXT NOT NULL,
  icon        TEXT NOT NULL,
  sections    TEXT NOT NULL DEFAULT '[]',
  theme       TEXT NOT NULL DEFAULT 'default',
  backgroundUrl TEXT,
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id          TEXT PRIMARY KEY,
  profileId   TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  sectionLabel TEXT NOT NULL,
  sourceType  TEXT NOT NULL CHECK(sourceType IN ('direct', 'embed')),
  sourceUrl   TEXT NOT NULL,
  posterUrl   TEXT,
  ordering    INTEGER NOT NULL DEFAULT 0,
  createdAt   TEXT NOT NULL,
  updatedAt   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_profile ON media(profileId);
CREATE INDEX IF NOT EXISTS idx_media_section ON media(profileId, sectionLabel, ordering);
