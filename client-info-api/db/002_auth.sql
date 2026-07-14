BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'department_head', 'user')),
  password_hash text NOT NULL,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(permissions) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_role_idx
  ON users (role);
CREATE INDEX IF NOT EXISTS users_created_at_idx
  ON users (created_at);

CREATE TABLE IF NOT EXISTS user_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  csrf_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  request_ip text NOT NULL DEFAULT '',
  request_user_agent text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
  ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx
  ON user_sessions (expires_at);

CREATE TABLE IF NOT EXISTS user_binotel_manager_assignments (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  internal_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_binotel_manager_assignments_pk PRIMARY KEY (user_id, internal_number),
  CONSTRAINT user_binotel_manager_assignments_manager_uniq UNIQUE (internal_number)
);

CREATE INDEX IF NOT EXISTS user_binotel_manager_assignments_user_idx
  ON user_binotel_manager_assignments (user_id, internal_number);

INSERT INTO app_schema_migrations (version)
VALUES ('002_auth')
ON CONFLICT (version) DO NOTHING;

COMMIT;
