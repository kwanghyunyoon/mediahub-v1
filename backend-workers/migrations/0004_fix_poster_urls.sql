-- Null out poster URLs pointing to the defunct mcqueen-app.pages.dev project
UPDATE media
SET posterUrl = NULL, updatedAt = '2026-06-08T00:00:00.000Z'
WHERE posterUrl LIKE '%mcqueen-app.pages.dev%';
