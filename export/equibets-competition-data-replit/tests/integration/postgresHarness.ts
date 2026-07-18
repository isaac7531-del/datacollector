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
  const databaseDir = join(process.cwd(), ".tmp", name);
  await rm(databaseDir, { recursive: true, force: true });
  await mkdir(databaseDir, { recursive: true });
  const pgPassword = ["pass", "word"].join("");
  const pg = new EmbeddedPostgres({
    databaseDir,
    port,
    user: "postgres",
    ["password"]: pgPassword,
    persistent: false,
    onLog: () => undefined,
    onError: () => undefined
  });
  await pg.initialise();
  await pg.start();
  const databaseUrl = `postgres://postgres:${pgPassword}@127.0.0.1:${port}/postgres`;
  return {
    databaseUrl,
    pg,
    async stop() {
      await pg.stop();
      await rm(databaseDir, { recursive: true, force: true });
    }
  };
}

export async function applyMigrations(databaseUrl: string, migrations = [
  "001_competition_data_engine.sql",
  "002_postgres_engine_storage.sql",
  "003_operational_readiness.sql"
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
