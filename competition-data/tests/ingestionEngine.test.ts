import { describe, expect, it } from "vitest";
import {
  CompetitionDataEngine,
  InMemoryCompetitionDataRepository,
  type CompetitionDataConnector,
  type NormalizedCompetitionGraph
} from "../src";

describe("CompetitionDataEngine", () => {
  it("runs a dry-run ingestion from a normalized connector", async () => {
    const graph: NormalizedCompetitionGraph = {
      competition: {
        externalIds: [{ sourceSystem: "test", sourceId: "comp-1" }],
        name: "Test Horse Trials",
        status: "completed",
        countryCode: "AU",
        startDate: "2026-01-01"
      },
      events: [],
      horses: [
        {
          externalIds: [{ sourceSystem: "test", sourceId: "horse-1" }],
          name: "Example Horse"
        }
      ],
      riders: [
        {
          externalIds: [{ sourceSystem: "test", sourceId: "rider-1" }],
          displayName: "Example Rider"
        }
      ],
      results: [
        {
          externalIds: [{ sourceSystem: "test", sourceId: "result-1" }],
          horseName: "Example Horse",
          riderName: "Example Rider",
          placing: 1,
          status: "placed"
        }
      ],
      entries: [],
      rankings: [],
      provenance: [],
      issues: []
    };

    const connector: CompetitionDataConnector = {
      descriptor: {
        id: "test-connector",
        name: "Test connector",
        status: "enabled",
        source: {
          id: "test-source",
          name: "Test source",
          kind: "other_public",
          mode: "public_file",
          official: false
        },
        capabilities: ["discover", "fetch_results"],
        complianceNote: "Test source only."
      },
      async discover() {
        return [
          {
            id: "test-item",
            connectorId: "test-connector",
            source: this.descriptor.source
          }
        ];
      },
      async collect() {
        return [
          {
            connectorId: "test-connector",
            source: this.descriptor.source,
            fetchedAt: "2026-01-01T00:00:00.000Z",
            data: graph,
            contentType: "application/json",
            rawRecordId: "test-item"
          }
        ];
      }
    };

    const engine = new CompetitionDataEngine({
      repository: new InMemoryCompetitionDataRepository(),
      connectors: [connector]
    });

    const summary = await engine.runIngestion({ dryRun: true });

    expect(summary.discovered).toBe(1);
    expect(summary.payloads).toBe(1);
    expect(summary.graphs).toBe(1);
    expect(summary.created).toBe(4);
  });
});
