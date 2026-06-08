-- Drop old schema (all tables empty, safe to replace)
DROP TABLE IF EXISTS content_visibility;
DROP TABLE IF EXISTS clips;
DROP TABLE IF EXISTS episodes;
DROP TABLE IF EXISTS shows;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS profiles;

-- Create new schema
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

-- Seed: McQueen Zone profile
INSERT INTO profiles (id, name, passcode, color, icon, sections, theme, backgroundUrl, createdAt, updatedAt)
VALUES (
  '43c078b5-165c-4c0c-abaf-5e32a51123c4',
  'McQueen Zone',
  '8619',
  '#FF5200',
  'Clapperboard',
  '["Cars by Pixar","Bluey","SuperKitties","Pocoyo"]',
  'default',
  NULL,
  '2026-06-08T00:00:00.000Z',
  '2026-06-08T00:00:00.000Z'
);

-- Cars by Pixar (5 items)
INSERT INTO media (id, profileId, title, description, sectionLabel, sourceType, sourceUrl, posterUrl, ordering, createdAt, updatedAt) VALUES
('dbe08c7d-95cc-46c3-ae74-037516bd1a0b','43c078b5-165c-4c0c-abaf-5e32a51123c4','The Journey of Lightning McQueen','20 min','Cars by Pixar','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/mcqueen-journey.mp4','https://mcqueen-app.pages.dev/poster-mcqueen.jpg',0,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('871344d3-364d-4157-94d9-6890a9cf0a06','43c078b5-165c-4c0c-abaf-5e32a51123c4','Mater''s Tall Tales','~1 hr','Cars by Pixar','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/maters-tall-tales.mp4','https://mcqueen-app.pages.dev/poster-mcqueen.jpg',1,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('d8ba8c92-f61a-490e-972e-ad669d3547d7','43c078b5-165c-4c0c-abaf-5e32a51123c4','Cars On The Road — Full Episodes 1–5','~45 min','Cars by Pixar','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/cars-on-the-road.mp4','https://mcqueen-app.pages.dev/poster-mcqueen.jpg',2,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('65afc71e-dca1-4a51-a68e-4b1bb72e4d6e','43c078b5-165c-4c0c-abaf-5e32a51123c4','Every Mater''s Tall Tale','~2 hr','Cars by Pixar','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/mater.mp4','https://mcqueen-app.pages.dev/poster-mcqueen.jpg',3,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('86a42238-0f02-4076-9df0-f1e76b3b8c93','43c078b5-165c-4c0c-abaf-5e32a51123c4','McQueen''s Off-Road Race','~5 min','Cars by Pixar','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/cars-offroad-race.mp4','https://mcqueen-app.pages.dev/poster-mcqueen.jpg',4,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z');

-- Bluey (5 items)
INSERT INTO media (id, profileId, title, description, sectionLabel, sourceType, sourceUrl, posterUrl, ordering, createdAt, updatedAt) VALUES
('5bbdf27e-9a5b-456b-8f02-da776675cd46','43c078b5-165c-4c0c-abaf-5e32a51123c4','Bluey Shorts','24 sec','Bluey','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/1.mp4','https://mcqueen-app.pages.dev/poster-bluey.jpg',0,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('c857813e-5c62-4ca2-bcbf-5298dd027ca5','43c078b5-165c-4c0c-abaf-5e32a51123c4','Bluey Episodes Part 1','14 min','Bluey','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/2a.mp4','https://mcqueen-app.pages.dev/poster-bluey.jpg',1,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('20230882-dac8-4f04-a7ce-fea6e9a119b4','43c078b5-165c-4c0c-abaf-5e32a51123c4','Bluey Episodes Part 2','7 min','Bluey','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/2b.mp4','https://mcqueen-app.pages.dev/poster-bluey.jpg',2,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('5df2ac71-94f2-4484-8c1c-c191d6a8ba55','43c078b5-165c-4c0c-abaf-5e32a51123c4','Bluey — 18 Full Episodes','~1.5 hr','Bluey','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/bluey-18.mp4','https://mcqueen-app.pages.dev/poster-bluey.jpg',3,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('a062d25d-a12f-4190-8748-387ebd02ff91','43c078b5-165c-4c0c-abaf-5e32a51123c4','Bluey Full Seasons 1–3','2 hr','Bluey','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/bluey-seasons-1-3.mp4','https://mcqueen-app.pages.dev/poster-bluey.jpg',4,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z');

-- SuperKitties (4 items)
INSERT INTO media (id, profileId, title, description, sectionLabel, sourceType, sourceUrl, posterUrl, ordering, createdAt, updatedAt) VALUES
('9be1bb86-589b-452a-bb36-19893cdb4588','43c078b5-165c-4c0c-abaf-5e32a51123c4','S1 E1: The Great Yarn Caper','~22 min','SuperKitties','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/superkitties-s1e1.mp4','https://mcqueen-app.pages.dev/poster-superkitties.jpg',0,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('57b6f070-9ac5-4f59-84f0-cc98ba792943','43c078b5-165c-4c0c-abaf-5e32a51123c4','Amara''s Tiara','~5 min','SuperKitties','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/superkitties-amaras-tiara.mp4','https://mcqueen-app.pages.dev/poster-superkitties.jpg',1,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('d79f98dc-3350-4640-bed1-1c9248168fac','43c078b5-165c-4c0c-abaf-5e32a51123c4','S1 E2: Fireworks Fright','~11 min','SuperKitties','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/superkitties-s1e2.mp4','https://mcqueen-app.pages.dev/poster-superkitties.jpg',2,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('cda335a6-d549-47c5-a46d-bbcb3908a637','43c078b5-165c-4c0c-abaf-5e32a51123c4','S1 E3: Silent Surprise','~11 min','SuperKitties','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/superkitties-s1e3.mp4','https://mcqueen-app.pages.dev/poster-superkitties.jpg',3,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z');

-- Pocoyo (4 items)
INSERT INTO media (id, profileId, title, description, sectionLabel, sourceType, sourceUrl, posterUrl, ordering, createdAt, updatedAt) VALUES
('e285f7fa-7d1c-40a0-b74e-ea91a88a90e5','43c078b5-165c-4c0c-abaf-5e32a51123c4','Pocoyo — Episodes Part 1','~1.5 hr','Pocoyo','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/pocoyo1.mp4','https://mcqueen-app.pages.dev/poster-pocoyo.jpg',0,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('e4993124-d399-47bf-b6d0-d40faa3f0724','43c078b5-165c-4c0c-abaf-5e32a51123c4','Pocoyo — Episodes Part 2','~2 hr','Pocoyo','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/pocoyo2.mp4','https://mcqueen-app.pages.dev/poster-pocoyo.jpg',1,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('b4982f93-4bf4-40ef-a9e2-6b8070f1efc3','43c078b5-165c-4c0c-abaf-5e32a51123c4','Pocoyo Spa — Part 1','~2 hr','Pocoyo','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/pocoyoSPA1.mp4','https://mcqueen-app.pages.dev/poster-pocoyo.jpg',2,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z'),
('a7680a37-0ca4-475a-8ff0-cda1e1eb3f0f','43c078b5-165c-4c0c-abaf-5e32a51123c4','Pocoyo Spa — Part 2','~2 hr','Pocoyo','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/pocoyoSPA2.mp4','https://mcqueen-app.pages.dev/poster-pocoyo.jpg',3,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z');
