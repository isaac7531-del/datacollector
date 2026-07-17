-- Rollback for 002_postgres_engine_storage.sql.
-- This removes only Competition Data Engine tables created by the migration.
-- Review before running in production and export data first if needed.

DROP TABLE IF EXISTS competition_data_event_outbox;
DROP TABLE IF EXISTS competition_data_scheduler_locks;
DROP TABLE IF EXISTS competition_data_connector_health;
DROP TABLE IF EXISTS competition_data_result_versions;
DROP TABLE IF EXISTS competition_data_resolution_candidates;
DROP TABLE IF EXISTS competition_data_conflicts;
DROP TABLE IF EXISTS competition_data_staged_records;
DROP TABLE IF EXISTS competition_data_import_runs;
DROP TABLE IF EXISTS competition_data_canonical_records;
