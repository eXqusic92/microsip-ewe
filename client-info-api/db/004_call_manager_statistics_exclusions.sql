BEGIN;

CREATE TABLE IF NOT EXISTS call_manager_statistics_exclusions (
  call_id text PRIMARY KEY REFERENCES call_summaries(call_id) ON DELETE CASCADE,
  excluded boolean NOT NULL DEFAULT true,
  changed_by_user_id text NOT NULL DEFAULT '',
  changed_by_username text NOT NULL DEFAULT '',
  changed_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS call_manager_statistics_exclusions_active_idx
  ON call_manager_statistics_exclusions (call_id)
  WHERE excluded = true;

INSERT INTO app_schema_migrations (version)
VALUES ('004_call_manager_statistics_exclusions')
ON CONFLICT (version) DO NOTHING;

COMMIT;
