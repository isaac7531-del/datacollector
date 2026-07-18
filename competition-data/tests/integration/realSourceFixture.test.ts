import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { CompetitionDataEngine, InMemoryCompetitionDataRepository, createCsvResultsConnector, syntheticNationalCsvConfiguration } from "../../src";

describe("real-source-derived fixture validation", () => {
  it("imports the tiny transformed BDWP Burghley sample", async () => {
    const repository = new InMemoryCompetitionDataRepository();
    const engine = new CompetitionDataEngine({
      repository,
      connectors: [
        createCsvResultsConnector({
          id: "bdwp-burghley-sample",
          enabled: true,
          source: {
            id: "bdwp-burghley-2017",
            name: "BDWP Burghley 2017 public result page sample",
            kind: "event_organiser",
            mode: "public_page",
            countryCode: "GB",
            official: false,
            sourceUrl: "http://www.bdwp.co.uk/cgi-bin/3d.pl?buster=no&fn=bur17.csv&frame=set&page=sj_res&sct=C"
          },
          csvText: readFileSync(join(process.cwd(), "tests/fixtures/real-sources/bdwp-burghley-2017-sj-sample.csv"), "utf8"),
          mapping: syntheticNationalCsvConfiguration.resultMappings ?? {}
        })
      ]
    });
    const summary = await engine.runConnector("bdwp-burghley-sample");
    expect(summary.created).toBeGreaterThan(0);
    expect(repository.results).toHaveLength(5);
  });
});
