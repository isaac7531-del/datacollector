import { describe, expect, it } from "vitest";
import { createNutritionDataEngine, InMemoryNutritionDataRepository } from "../../src";
import { OperationalWorkerRunner } from "../../src/workers/operationalWorkers";

describe("operational workers", () => {
  it("records runs, checkpoints, and lock-protected worker execution", async () => {
    const repository = new InMemoryNutritionDataRepository();
    const engine = createNutritionDataEngine({ repository });
    const runner = new OperationalWorkerRunner(engine, repository);
    const result = await runner.run("discovery");
    expect(result.summary.discovered).toBe(0);
    expect(await repository.listOperationalRuns()).toHaveLength(2);
    expect(await repository.getCheckpoint("nutrition-worker:discovery:all")).toBeTruthy();
  });
});
