#!/usr/bin/env node
console.log(`Run the SQL migrations in order against PostgreSQL:

psql "$DATABASE_URL" -f migrations/001_competition_data_engine.sql
psql "$DATABASE_URL" -f migrations/002_postgres_engine_storage.sql

Rollback for migration 002:
psql "$DATABASE_URL" -f migrations/002_postgres_engine_storage.rollback.sql

Migration 001 is a reference schema from the initial package pass. Prefer migration 002 for the production JSONB repository adapter.
`);
