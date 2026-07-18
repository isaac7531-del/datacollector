-- Reference schema for the Competition Data Engine.
-- Adapt to the main EquiBets application's ORM and naming conventions before use.

CREATE TABLE IF NOT EXISTS competition_data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  mode TEXT NOT NULL,
  country_code TEXT,
  official BOOLEAN NOT NULL DEFAULT FALSE,
  source_url TEXT,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competition_data_ingestion_runs (
  id TEXT PRIMARY KEY,
  connector_ids TEXT NOT NULL,
  status TEXT NOT NULL,
  discovered_count INTEGER NOT NULL DEFAULT 0,
  payload_count INTEGER NOT NULL DEFAULT 0,
  graph_count INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  ignored_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competition_data_raw_records (
  id TEXT PRIMARY KEY,
  ingestion_run_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_url TEXT,
  source_checksum TEXT,
  content_type TEXT,
  raw_payload_json TEXT NOT NULL,
  fetched_at TIMESTAMP NOT NULL,
  FOREIGN KEY (ingestion_run_id) REFERENCES competition_data_ingestion_runs(id),
  FOREIGN KEY (source_id) REFERENCES competition_data_sources(id)
);

CREATE TABLE IF NOT EXISTS competition_data_reconciliation_plans (
  id TEXT PRIMARY KEY,
  ingestion_run_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  score REAL NOT NULL,
  reason TEXT NOT NULL,
  incoming_json TEXT NOT NULL,
  matched_entity_id TEXT,
  matched_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by_user_id TEXT,
  FOREIGN KEY (ingestion_run_id) REFERENCES competition_data_ingestion_runs(id)
);

CREATE TABLE IF NOT EXISTS competition_data_provenance (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  source_url TEXT,
  source_checksum TEXT,
  raw_record_id TEXT,
  import_batch_id TEXT,
  licence_note TEXT,
  fetched_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES competition_data_sources(id)
);
