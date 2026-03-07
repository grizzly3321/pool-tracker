ALTER TABLE players ADD COLUMN IF NOT EXISTS phone text;

UPDATE players SET phone = '+18103470614' WHERE id = '61190e0f-ed2a-4a40-be72-3c02231265f8'; -- Jon
UPDATE players SET phone = '+18105169232' WHERE id = '3f1a63b3-98aa-458a-96d0-e394ac90af25'; -- Drew
UPDATE players SET phone = '+18103485109' WHERE id = 'af01dd21-8cbf-448e-8baf-357e34e324c6'; -- Dad
UPDATE players SET phone = '+15866106361' WHERE id = '16e0f049-afb4-449a-94c3-901f0c6abda1'; -- Jim
