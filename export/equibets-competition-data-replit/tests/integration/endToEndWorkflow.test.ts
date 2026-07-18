import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  CompetitionDataEngine,
  InMemoryCompetitionDataRepository,
  createCsvResultsConnector,
  createManualImportConnector,
  syntheticNationalCsvConfiguration
} from "../../src";

describe("end-to-end workflow", () => {
  it("stages, normalizes, reconciles, preserves private metadata, and emits events", async () => {
    const repository = new InMemoryCompetitionDataRepository({
      results: [
        {
          id: "private-result",
          externalIds: [{ sourceSystem: "manual", sourceId: "manual-north-wind" }],
          horseName: "North Wind",
          riderName: "Liam Scott",
          score: 35,
          placing: 3,
          status: "placed",
          metadata: { privateNotes: "Do not overwrite" }
        }
      ]
    });
    const csvText = readFileSync(join(process.cwd(), "tests/fixtures/eventing-results.csv"), "utf8");
    const source = {
      id: "synthetic-national-eventing",
      name: "Synthetic National Eventing Federation",
      kind: "national_federation" as const,
      mode: "official_export" as const,
      countryCode: "AU",
      official: true
    };
    const engine = new CompetitionDataEngine({
      repository,
      connectors: [
        createManualImportConnector({ enabled: true, submissions: [] }),
        createCsvResultsConnector({
          id: "synthetic-national-eventing",
          enabled: true,
          source,
          csvText,
          mapping: syntheticNationalCsvConfiguration.resultMappings ?? {}
        })
      ]
    });

    const summary = await engine.runConnector("synthetic-national-eventing");
    expect(summary.created).toBeGreaterThan(0);
    expect(repository.stagedRecords).toHaveLength(1);
    expect(repository.outboxEvents.some((event) => event.type === "competitionData.result.created")).toBe(true);
    expect(repository.results.find((result) => result.id === "private-result")?.metadata?.privateNotes).toBe("Do not overwrite");

    await repository.applyReconciliationPlan({
      competition: { action: "ignore", score: 1, reason: "test", incoming: { externalIds: [], name: "Ignored", status: "unknown" } },
      events: [],
      horses: [],
      riders: [],
      entries: [],
      rankings: [],
      issues: [],
      provenance: [],
      results: [
        {
          action: "update",
          score: 1,
          reason: "public correction",
          match: repository.results.find((result) => result.id === "private-result"),
          incoming: {
            id: "private-result",
            externalIds: [{ sourceSystem: "public", sourceId: "public-north-wind" }],
            horseName: "North Wind",
            riderName: "Liam Scott",
            score: 31,
            placing: 1,
            status: "placed",
            metadata: { privateNotes: "PUBLIC SHOULD NOT WIN" }
          }
        }
      ]
    });
    expect(repository.results.find((result) => result.id === "private-result")?.metadata?.privateNotes).toBe("Do not overwrite");
  });
});
