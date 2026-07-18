import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("phase 3 CLI commands", () => {
  it("prints manufacturer status as structured JSON", () => {
    const output = execFileSync("npx", ["tsx", "src/cli/cli.ts", "manufacturer:status", "--manufacturer", "mitavite-au"], { cwd: process.cwd(), encoding: "utf8" });
    const parsed = JSON.parse(output);
    expect(parsed.manufacturerId).toBe("mitavite-au");
  });

  it("validates forage lab imports from a file", () => {
    const dir = mkdtempSync(join(tmpdir(), "nutrition-lab-"));
    const file = join(dir, "hay.csv");
    writeFileSync(file, "Nutrient,Value,Unit\nDry Matter,90,%\nCrude Protein,11,%\nADF,31,%\n");
    const output = execFileSync("npx", ["tsx", "src/cli/cli.ts", "forage-lab:validate", "--lab", "dairy-one", "--file", file], { cwd: process.cwd(), encoding: "utf8" });
    const parsed = JSON.parse(output);
    expect(parsed.valid).toBe(true);
    expect(parsed.extractedNutrients).toContain("crude_protein");
  });
});
