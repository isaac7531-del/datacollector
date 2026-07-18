#!/usr/bin/env node
import { readFile } from "fs/promises";
import { join } from "path";
import { Pool } from "pg";

const forwardMigrations = [
  "001_competition_data_engine.sql",
  "002_postgres_engine_storage.sql",
  "003_operational_readiness.sql"
];

const rollbackMigrations = [
  "003_operational_readiness.rollback.sql",
  "002_postgres_engine_storage.rollback.sql"
];

async function run(): Promise<void> {
  const mode = process.argv[2] ?? "up";
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for migrations.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const migrations = mode === "rollback" ? rollbackMigrations : forwardMigrations;

  try {
    for (const migration of migrations) {
      const sql = await readFile(join(process.cwd(), "migrations", migration), "utf8");
      await pool.query(sql);
      console.log(JSON.stringify({ migration, applied: true }));
    }
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
