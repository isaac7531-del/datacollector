-- Live source acquisition network tables.

CREATE TABLE IF NOT EXISTS competition_data_source_event_checkpoints (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_data_source_event_source_state
  ON competition_data_source_event_checkpoints ((payload->>'source'), (payload->>'currentState'));

CREATE INDEX IF NOT EXISTS idx_competition_data_source_event_next_check
  ON competition_data_source_event_checkpoints ((payload->>'nextScheduledCheckAt'));

CREATE TABLE IF NOT EXISTS competition_data_source_health (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competition_data_backfill_plans (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_data_backfill_source_status
  ON competition_data_backfill_plans ((payload->>'source'), (payload->>'status'));

CREATE TABLE IF NOT EXISTS competition_data_browser_collection_queue (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competition_data_browser_queue_status
  ON competition_data_browser_collection_queue (status, created_at);

CREATE TABLE IF NOT EXISTS competition_data_parser_failures (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  raw_record_reference TEXT,
  error TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
