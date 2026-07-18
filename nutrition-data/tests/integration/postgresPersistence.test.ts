import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("postgres operational migrations", () => {
  it("defines Phase 2 persistence tables for versions, evidence, documents, operations, checkpoints, and locks", () => {
    const sql = readFileSync(join(process.cwd(), "migrations/002_operational_live_data.sql"), "utf8");
    for (const table of [
      "product_versions",
      "availability_evidence",
      "distributor_stockists",
      "price_observations",
      "product_documents",
      "operational_runs",
      "checkpoints",
      "locks"
    ]) {
      expect(sql).toContain(table);
    }
  });
});
