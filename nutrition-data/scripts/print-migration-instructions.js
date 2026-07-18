#!/usr/bin/env node
console.log(`Apply migrations in order from ./migrations.

For Postgres:
  psql "$DATABASE_URL" -f migrations/001_nutrition_data_engine.sql
  psql "$DATABASE_URL" -f migrations/002_operational_live_data.sql

The package ships an in-memory repository for tests and local embedding. Use both SQL migrations when integrating with a persistent EquiBets database.`);
