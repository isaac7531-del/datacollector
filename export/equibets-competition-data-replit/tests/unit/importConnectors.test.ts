import { readFileSync } from "fs";
import { join } from "path";
import writeXlsxFile from "write-excel-file/node";
import { describe, expect, it } from "vitest";
import {
  createCsvResultsConnector,
  createExcelResultsConnector,
  createJsonResultsConnector,
  createXmlResultsConnector,
  InMemoryCompetitionDataRepository,
  CompetitionDataEngine,
  syntheticNationalCsvConfiguration
} from "../../src";

const source = {
  id: "synthetic-source",
  name: "Synthetic Source",
  kind: "national_federation" as const,
  mode: "official_export" as const,
  countryCode: "AU",
  official: true
};

describe("import connectors", () => {
  it("imports CSV eventing results", async () => {
    const csvText = readFileSync(join(process.cwd(), "tests/fixtures/eventing-results.csv"), "utf8");
    const repository = new InMemoryCompetitionDataRepository();
    const engine = new CompetitionDataEngine({
      repository,
      connectors: [
        createCsvResultsConnector({
          enabled: true,
          source,
          csvText,
          mapping: syntheticNationalCsvConfiguration.resultMappings ?? {}
        })
      ]
    });

    const summary = await engine.runConnector("generic-csv");

    expect(summary.graphs).toBe(1);
    expect(repository.results).toHaveLength(11);
    expect(repository.stagedRecords).toHaveLength(1);
    expect(repository.results.some((result) => result.metadata?.eventing)).toBe(true);
  });

  it("imports source-neutral JSON", async () => {
    const jsonText = readFileSync(join(process.cwd(), "tests/fixtures/source-neutral-sample.json"), "utf8");
    const repository = new InMemoryCompetitionDataRepository();
    const engine = new CompetitionDataEngine({
      repository,
      connectors: [createJsonResultsConnector({ enabled: true, source, jsonText })]
    });

    const summary = await engine.runConnector("generic-json");
    expect(summary.created).toBeGreaterThan(0);
    expect(repository.results[0]?.horseName).toBe("JSON Star");
  });

  it("imports source-neutral XML", async () => {
    const xmlText = readFileSync(join(process.cwd(), "tests/fixtures/source-neutral-sample.xml"), "utf8");
    const repository = new InMemoryCompetitionDataRepository();
    const engine = new CompetitionDataEngine({
      repository,
      connectors: [createXmlResultsConnector({ enabled: true, source, xmlText })]
    });

    const summary = await engine.runConnector("generic-xml");
    expect(summary.created).toBeGreaterThan(0);
    expect(repository.results[0]?.horseName).toBe("XML Star");
  });

  it("imports .xlsx results", async () => {
    const buffer = await (
      await writeXlsxFile([
        ["event_name", "start_date", "country", "venue", "class_name", "horse_name", "horse_reg", "rider_name", "rider_member", "start_number", "final_score", "final_place", "status"],
        ["XLSX Horse Trials", "2026-07-01", "AU", "Excel Park", "EvA80", "Excel Horse", "EH1", "Excel Rider", "ER1", "1", "30.1", "1", "placed"]
      ])
    ).toBuffer();
    const repository = new InMemoryCompetitionDataRepository();
    const engine = new CompetitionDataEngine({
      repository,
      connectors: [
        createExcelResultsConnector({
          enabled: true,
          source,
          buffer,
          mapping: syntheticNationalCsvConfiguration.resultMappings ?? {}
        })
      ]
    });

    const summary = await engine.runConnector("generic-excel");
    expect(summary.created).toBeGreaterThan(0);
    expect(repository.horses[0]?.name).toBe("Excel Horse");
  });
});
