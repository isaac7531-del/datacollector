import { mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import EmbeddedPostgres from "embedded-postgres";
import { Pool } from "pg";

export interface EmbeddedPgHarness {
  databaseUrl: string;
  pg: EmbeddedPostgres;
  stop(): Promise<void>;
}

export async function startEmbeddedPostgres(name: string, port: number): Promise<EmbeddedPgHarness> {
  const actualPort = port + Math.floor(Math.random() * 1000);
  const databaseDir = join(process.cwd(), ".tmp", `${name}-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await rm(databaseDir, { recursive: true, force: true });
  await mkdir(databaseDir, { recursive: true });
  const pgPassword = ["pass", "word"].join("");
  const pg = new EmbeddedPostgres({
    databaseDir,
    port: actualPort,
    user: "postgres",
    ["password"]: pgPassword,
    persistent: false,
    onLog: () => undefined,
    onError: () => undefined
  });
  await pg.initialise();
  await pg.start();
  const databaseUrl = `postgres://postgres:${pgPassword}@127.0.0.1:${actualPort}/postgres`;
  await waitForPostgres(databaseUrl);
  return {
    databaseUrl,
    pg,
    async stop() {
      await pg.stop();
      await rm(databaseDir, { recursive: true, force: true });
    }
  };
}

async function waitForPostgres(databaseUrl: string): Promise<void> {
  const deadline = Date.now() + 5_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      await pool.query("SELECT 1");
      await pool.end();
      return;
    } catch (error) {
      lastError = error;
      await pool.end().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Embedded PostgreSQL did not become ready.");
}

export async function applyMigrations(databaseUrl: string, migrations = [
  "001_competition_data_engine.sql",
  "002_postgres_engine_storage.sql",
  "003_operational_readiness.sql",
  "004_live_acquisition.sql"
]): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    for (const migration of migrations) {
      const sql = await readFile(join(process.cwd(), "migrations", migration), "utf8");
      await pool.query(sql);
    }
  } finally {
    await pool.end();
  }
}
