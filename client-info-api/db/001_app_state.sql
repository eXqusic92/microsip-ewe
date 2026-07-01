BEGIN;

CREATE TABLE IF NOT EXISTS app_schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS client_notes (
  id uuid PRIMARY KEY,
  phone text NOT NULL,
  phone_digits text NOT NULL,
  note_text text NOT NULL,
  created_by text NOT NULL DEFAULT 'Оператор',
  source text NOT NULL DEFAULT 'local_json',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS client_notes_phone_idx
  ON client_notes (phone);
CREATE INDEX IF NOT EXISTS client_notes_phone_digits_created_at_idx
  ON client_notes (phone_digits, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_analysis_settings_profiles (
  id bigserial PRIMARY KEY,
  profile_key text NOT NULL DEFAULT 'default',
  settings_version integer NOT NULL,
  schema_version text NOT NULL,
  revision text NOT NULL,
  semantic_revision text NOT NULL,
  scoring_revision text NOT NULL,
  settings_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_analysis_settings_profiles_profile_key_uniq UNIQUE (profile_key)
);

CREATE TABLE IF NOT EXISTS ai_analysis_call_types (
  id bigserial PRIMARY KEY,
  profile_id bigint NOT NULL REFERENCES ai_analysis_settings_profiles(id) ON DELETE CASCADE,
  call_type_key text NOT NULL,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  ai_brief text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#94a3b8',
  enabled boolean NOT NULL DEFAULT true,
  sort_order numeric NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT ai_analysis_call_types_profile_key_uniq UNIQUE (profile_id, call_type_key)
);

CREATE INDEX IF NOT EXISTS ai_analysis_call_types_profile_order_idx
  ON ai_analysis_call_types (profile_id, sort_order, call_type_key);
CREATE INDEX IF NOT EXISTS ai_analysis_call_types_enabled_idx
  ON ai_analysis_call_types (profile_id, enabled);

CREATE TABLE IF NOT EXISTS ai_analysis_metrics (
  id bigserial PRIMARY KEY,
  call_type_id bigint NOT NULL REFERENCES ai_analysis_call_types(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  label text NOT NULL,
  metric_group text NOT NULL DEFAULT '',
  metric_type text NOT NULL DEFAULT 'ai_option',
  description text NOT NULL DEFAULT '',
  ai_instructions text NOT NULL DEFAULT '',
  ai_brief text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  sort_order numeric NOT NULL DEFAULT 0,
  weight numeric NOT NULL DEFAULT 1 CHECK (weight >= 0),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT ai_analysis_metrics_call_type_key_uniq UNIQUE (call_type_id, metric_key)
);

CREATE INDEX IF NOT EXISTS ai_analysis_metrics_call_type_order_idx
  ON ai_analysis_metrics (call_type_id, sort_order, metric_key);
CREATE INDEX IF NOT EXISTS ai_analysis_metrics_enabled_idx
  ON ai_analysis_metrics (call_type_id, enabled);

CREATE TABLE IF NOT EXISTS ai_analysis_metric_options (
  id bigserial PRIMARY KEY,
  metric_id bigint NOT NULL REFERENCES ai_analysis_metrics(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  label text NOT NULL,
  score numeric CHECK (score IS NULL OR (score >= 0 AND score <= 5)),
  color text NOT NULL DEFAULT '#94a3b8',
  counts_toward_score boolean NOT NULL DEFAULT true,
  ai_instructions text NOT NULL DEFAULT '',
  ai_brief text NOT NULL DEFAULT '',
  sort_order numeric NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT ai_analysis_metric_options_metric_key_uniq UNIQUE (metric_id, option_key)
);

CREATE INDEX IF NOT EXISTS ai_analysis_metric_options_metric_order_idx
  ON ai_analysis_metric_options (metric_id, sort_order, option_key);
CREATE INDEX IF NOT EXISTS ai_analysis_metric_options_score_idx
  ON ai_analysis_metric_options (metric_id, counts_toward_score, score);

CREATE TABLE IF NOT EXISTS binotel_monitor_sync (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  monitor_since_timestamp bigint NOT NULL DEFAULT 0,
  ai_analysis_since_timestamp bigint NOT NULL DEFAULT 0,
  first_started_at timestamptz,
  last_incoming_timestamp bigint NOT NULL DEFAULT 0,
  last_outgoing_timestamp bigint NOT NULL DEFAULT 0,
  last_sync_at timestamptz,
  last_error text NOT NULL DEFAULT '',
  last_result jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO binotel_monitor_sync (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS binotel_calls (
  call_id text PRIMARY KEY,
  general_call_id text NOT NULL,
  started_at timestamptz,
  call_type text NOT NULL DEFAULT '',
  type_label text NOT NULL DEFAULT '',
  internal_number text NOT NULL DEFAULT '',
  internal_additional_data text NOT NULL DEFAULT '',
  external_number text NOT NULL DEFAULT '',
  external_digits text NOT NULL DEFAULT '',
  wait_sec integer NOT NULL DEFAULT 0,
  bill_sec integer NOT NULL DEFAULT 0,
  disposition text NOT NULL DEFAULT '',
  disposition_label text NOT NULL DEFAULT '',
  recording_status text NOT NULL DEFAULT '',
  recording_status_label text NOT NULL DEFAULT '',
  is_new_call boolean NOT NULL DEFAULT false,
  who_hung_up text NOT NULL DEFAULT '',
  ai_eligible boolean NOT NULL DEFAULT false,
  monitor_collected_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  recording_cache_status text NOT NULL DEFAULT '',
  recording_cache_error text NOT NULL DEFAULT '',
  recording_cache_updated_at timestamptz,
  customer_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  employee_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  pbx_number_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  history_payload jsonb NOT NULL DEFAULT '[]'::jsonb,
  payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS binotel_calls_started_at_idx
  ON binotel_calls (started_at DESC NULLS LAST, call_id DESC);
CREATE INDEX IF NOT EXISTS binotel_calls_external_digits_idx
  ON binotel_calls (external_digits);
CREATE INDEX IF NOT EXISTS binotel_calls_general_call_id_idx
  ON binotel_calls (general_call_id);
CREATE INDEX IF NOT EXISTS binotel_calls_disposition_idx
  ON binotel_calls (disposition);
CREATE INDEX IF NOT EXISTS binotel_calls_ai_eligible_started_at_idx
  ON binotel_calls (ai_eligible, started_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS binotel_calls_payload_gin_idx
  ON binotel_calls USING gin (payload);

CREATE TABLE IF NOT EXISTS call_summaries (
  call_id text PRIMARY KEY,
  general_call_id text NOT NULL,
  phone text NOT NULL DEFAULT '',
  phone_digits text NOT NULL DEFAULT '',
  call_started_at timestamptz,
  call_duration_sec integer,
  status text NOT NULL,
  stage text NOT NULL DEFAULT '',
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  terminal_failure boolean NOT NULL DEFAULT false,
  message text NOT NULL DEFAULT '',
  error text NOT NULL DEFAULT '',
  summary_text text,
  summary_model text,
  transcription_model text,
  transcription_provider text,
  summary_version text,
  analysis_schema_version text,
  analysis_revision text,
  analysis_semantic_revision text,
  analysis_scoring_revision text,
  call_type text,
  call_type_label text,
  call_type_confidence numeric,
  custom_overall_score numeric,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processing_started_at timestamptz,
  completed_at timestamptz,
  summary_payload jsonb,
  transcript_payload jsonb,
  transcription_payload jsonb,
  models_payload jsonb,
  recording_payload jsonb,
  usage_payload jsonb,
  client_context_payload jsonb,
  payload jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS call_summaries_status_updated_at_idx
  ON call_summaries (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS call_summaries_phone_digits_started_at_idx
  ON call_summaries (phone_digits, call_started_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS call_summaries_call_started_at_idx
  ON call_summaries (call_started_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS call_summaries_call_type_idx
  ON call_summaries (call_type);
CREATE INDEX IF NOT EXISTS call_summaries_analysis_revision_idx
  ON call_summaries (analysis_revision);
CREATE INDEX IF NOT EXISTS call_summaries_payload_gin_idx
  ON call_summaries USING gin (payload);

CREATE TABLE IF NOT EXISTS call_summary_transcript_segments (
  id bigserial PRIMARY KEY,
  call_id text NOT NULL REFERENCES call_summaries(call_id) ON DELETE CASCADE,
  segment_index integer NOT NULL,
  speaker text NOT NULL DEFAULT '',
  started_sec numeric,
  ended_sec numeric,
  text text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT call_summary_transcript_segments_call_index_uniq UNIQUE (call_id, segment_index)
);

CREATE INDEX IF NOT EXISTS call_summary_segments_call_idx
  ON call_summary_transcript_segments (call_id, segment_index);
CREATE INDEX IF NOT EXISTS call_summary_segments_speaker_idx
  ON call_summary_transcript_segments (speaker);

CREATE TABLE IF NOT EXISTS call_summary_speakers (
  id bigserial PRIMARY KEY,
  call_id text NOT NULL REFERENCES call_summaries(call_id) ON DELETE CASCADE,
  speaker text NOT NULL,
  role text NOT NULL DEFAULT 'unknown',
  evidence text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT call_summary_speakers_call_speaker_uniq UNIQUE (call_id, speaker)
);

CREATE INDEX IF NOT EXISTS call_summary_speakers_role_idx
  ON call_summary_speakers (role);

CREATE TABLE IF NOT EXISTS call_summary_metric_results (
  id bigserial PRIMARY KEY,
  call_id text NOT NULL REFERENCES call_summaries(call_id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  metric_label text NOT NULL DEFAULT '',
  metric_group text NOT NULL DEFAULT '',
  selected_option_key text NOT NULL DEFAULT '',
  selected_option_label text NOT NULL DEFAULT '',
  score numeric,
  max_score numeric,
  color text NOT NULL DEFAULT '#94a3b8',
  counts_toward_score boolean NOT NULL DEFAULT true,
  evidence text,
  improvement text,
  confidence numeric,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT call_summary_metric_results_call_metric_uniq UNIQUE (call_id, metric_key)
);

CREATE INDEX IF NOT EXISTS call_summary_metric_results_metric_idx
  ON call_summary_metric_results (metric_key, selected_option_key);
CREATE INDEX IF NOT EXISTS call_summary_metric_results_score_idx
  ON call_summary_metric_results (counts_toward_score, score, max_score);

CREATE TABLE IF NOT EXISTS call_summary_usage (
  id bigserial PRIMARY KEY,
  call_id text NOT NULL REFERENCES call_summaries(call_id) ON DELETE CASCADE,
  scope text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  cached_input_tokens integer NOT NULL DEFAULT 0,
  billable_input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  reasoning_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT call_summary_usage_call_scope_uniq UNIQUE (call_id, scope)
);

CREATE INDEX IF NOT EXISTS call_summary_usage_scope_idx
  ON call_summary_usage (scope);

CREATE TABLE IF NOT EXISTS recording_cache_entries (
  call_id text PRIMARY KEY,
  file_path text NOT NULL,
  filename text NOT NULL,
  content_type text NOT NULL DEFAULT 'audio/mpeg',
  bytes integer NOT NULL DEFAULT 0,
  cached_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recording_cache_expires_at_idx
  ON recording_cache_entries (expires_at);

INSERT INTO app_schema_migrations (version)
VALUES ('001_app_state')
ON CONFLICT (version) DO NOTHING;

COMMIT;
