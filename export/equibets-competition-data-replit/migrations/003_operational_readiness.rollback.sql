-- Rollback for 003_operational_readiness.sql.
-- Review event delivery state before running in production.

DROP INDEX IF EXISTS idx_competition_data_event_outbox_status_next;
DROP INDEX IF EXISTS idx_competition_data_event_outbox_idempotency;

ALTER TABLE competition_data_event_outbox
  DROP COLUMN IF EXISTS dead_lettered_at,
  DROP COLUMN IF EXISTS delivered_at,
  DROP COLUMN IF EXISTS schema_version,
  DROP COLUMN IF EXISTS idempotency_key,
  DROP COLUMN IF EXISTS error_history,
  DROP COLUMN IF EXISTS next_attempt_at,
  DROP COLUMN IF EXISTS retry_count,
  DROP COLUMN IF EXISTS status;

DROP TABLE IF EXISTS competition_data_rollback_audit;
DROP TABLE IF EXISTS competition_data_mapping_profiles;
DROP TABLE IF EXISTS competition_data_configuration;
