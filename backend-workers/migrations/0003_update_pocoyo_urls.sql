-- Update Pocoyo R2 URLs to descriptive filenames and add Pocoyo & Pato video
UPDATE media SET sourceUrl = 'https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/Pocoyo%20-%20Episodes%20Part%201.mp4', updatedAt = '2026-06-08T00:00:00.000Z' WHERE id = 'e285f7fa-7d1c-40a0-b74e-ea91a88a90e5';
UPDATE media SET sourceUrl = 'https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/Pocoyo%20-%20Episodes%20Part%202.mp4', updatedAt = '2026-06-08T00:00:00.000Z' WHERE id = 'e4993124-d399-47bf-b6d0-d40faa3f0724';
UPDATE media SET sourceUrl = 'https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/Pocoyo%20Spa%20-%20Part%201.mp4',         updatedAt = '2026-06-08T00:00:00.000Z' WHERE id = 'b4982f93-4bf4-40ef-a9e2-6b8070f1efc3';
UPDATE media SET sourceUrl = 'https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/Pocoyo%20Spa%20-%20Part%202.mp4',         updatedAt = '2026-06-08T00:00:00.000Z' WHERE id = 'a7680a37-0ca4-475a-8ff0-cda1e1eb3f0f';

INSERT OR IGNORE INTO media (id, profileId, title, description, sectionLabel, sourceType, sourceUrl, posterUrl, ordering, createdAt, updatedAt) VALUES
('c1f23a45-8b2e-4d67-a891-bc3456def012','43c078b5-165c-4c0c-abaf-5e32a51123c4','Pocoyo & Pato — Best Friends','~1 hr','Pocoyo','direct','https://pub-18415c7397b94c2d9a7b0f33a9846df4.r2.dev/Pocoyo%20-%20Pocoyo%20%26%20Pato%20Best%20Friends.mp4','https://mcqueen-app.pages.dev/poster-pocoyo.jpg',4,'2026-06-08T00:00:00.000Z','2026-06-08T00:00:00.000Z');
