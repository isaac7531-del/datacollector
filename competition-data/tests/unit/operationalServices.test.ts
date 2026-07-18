import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  InMemoryCompetitionDataRepository,
  ProvisionalResultLifecycle,
  RollbackService,
  defaultSeedConfiguration,
  inspectMappingFile,
  mappingProfileSchema,
  previewWithMapping
} from "../../src";

describe("operational services", () => {
  it("seeds idempotent baseline configuration into a repository", async () => {
    const repository = new InMemoryCompetitionDataRepository();
    await repository.saveConfiguration("default-connectors", defaultSeedConfiguration.connectors);
    await repository.saveConfiguration("default-connectors", defaultSeedConfiguration.connectors);
    expect(await repository.listConfigurations()).toHaveLength(1);
  });

  it("inspects and previews a mapping profile", async () => {
    const fixture = join(process.cwd(), "tests/fixtures/eventing-results.csv");
    const inspection = await inspectMappingFile(fixture);
    expect(inspection.columns).toContain("horse_name");
    const profile = mappingProfileSchema.parse({
      id: "test-profile",
      name: "Test Profile",
      fileFormat: "csv",
      mapping: {
        competitionName: "event_name",
        horseName: "horse_name",
        riderName: "rider_name",
        finalScore: "final_score",
        resultStatus: "status"
      }
    });
    const preview = await previewWithMapping(fixture, profile, 2);
    expect(preview.rows).toHaveLength(2);
    expect(preview.graphs[0]?.results).toHaveLength(2);
  });

  it("creates rollback plans and requires confirmation", async () => {
    const repository = new InMemoryCompetitionDataRepository();
    await repository.saveStagedRecord({
      id: "stage-1",
      connectorId: "test",
      sourceOrganisation: "Test",
      sourceFormat: "csv",
      dataType: "result",
      publicationStatus: "final",
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      lastChangedAt: new Date().toISOString(),
      contentFingerprint: "abc",
      validationState: "valid",
      matchState: "matched",
      processingState: "persisted",
      errors: [],
      importRunId: "import-1",
      retryCount: 0,
      version: 1
    });
    const service = new RollbackService(repository);
    expect((await service.plan("import-1")).recordsToRemove).toHaveLength(1);
    await expect(service.apply("import-1", "wrong")).rejects.toThrow(/confirmation/);
    expect((await service.apply("import-1", "import-1")).applied).toBe(true);
  });

  it("handles provisional result lifecycle without duplicate unchanged events", async () => {
    const repository = new InMemoryCompetitionDataRepository();
    const lifecycle = new ProvisionalResultLifecycle(repository);
    const sourceReference = {
      source: { id: "test", name: "Test", kind: "other_public" as const, mode: "public_file" as const, official: false },
      importedAt: new Date().toISOString()
    };
    const result = { externalIds: [{ sourceSystem: "test", sourceId: "r1" }], horseName: "Horse", riderName: "Rider", score: 30, status: "placed" as const };
    expect((await lifecycle.record("r1", result, "provisional", sourceReference)).changed).toBe(true);
    expect((await lifecycle.record("r1", result, "provisional", sourceReference)).changed).toBe(false);
    expect((await lifecycle.record("r1", { ...result, score: 29 }, "final", sourceReference)).changed).toBe(true);
    expect(repository.outboxEvents.map((event) => event.type)).toContain("competitionData.result.finalised");
  });
});
