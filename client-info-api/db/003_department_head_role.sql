BEGIN;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'department_head', 'user'));

INSERT INTO app_schema_migrations (version)
VALUES ('003_department_head_role')
ON CONFLICT (version) DO NOTHING;

COMMIT;
