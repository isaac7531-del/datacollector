-- Production PostgreSQL storage for the Competition Data Engine.
-- Safe to run repeatedly. It creates additive tables only.

CREATE TABLE IF NOT EXISTS competition_data_canonical_records (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  external_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  search_name TEXT,
  country_code TEXT,
  date_value TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_data_canonical_type_name
  ON competition_data_canonical_records (entity_type, search_name);

CREATE INDEX IF NOT EXISTS idx_competition_data_canonical_external_ids
  ON competition_data_canonical_records USING GIN (external_ids);

CREATE TABLE IF NOT EXISTS competition_data_import_runs (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competition_data_staged_records (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_data_staged_import_run
  ON competition_data_staged_records ((payload->>'importRunId'));

CREATE INDEX IF NOT EXISTS idx_competition_data_staged_processing_state
  ON competition_data_staged_records ((payload->>'processingState'));

CREATE TABLE IF NOT EXISTS competition_data_conflicts (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_data_conflicts_status
  ON competition_data_conflicts ((payload->>'status'));

CREATE TABLE IF NOT EXISTS competition_data_resolution_candidates (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_data_resolution_status
  ON competition_data_resolution_candidates ((payload->>'status'));

CREATE TABLE IF NOT EXISTS competition_data_result_versions (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_data_result_versions_result
  ON competition_data_result_versions ((payload->>'canonicalResultId'));

CREATE TABLE IF NOT EXISTS competition_data_connector_health (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competition_data_scheduler_locks (
  scope TEXT PRIMARY KEY,
  id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_data_scheduler_locks_expires
  ON competition_data_scheduler_locks (expires_at);

CREATE TABLE IF NOT EXISTS competition_data_event_outbox (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
