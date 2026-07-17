import { readFileSync } from "fs";
import {
  CompetitionDataEngine,
  InMemoryCompetitionDataRepository,
  createCsvResultsConnector,
  createPublicFileUrlConnector,
  syntheticNationalCsvConfiguration
} from "../index";
import type { DataSource } from "../domain/types";
import type { TableColumnMapping } from "../normalisation/sourceNeutral";

export function createCliEngine(options: { filePath?: string; url?: string; connectorId?: string } = {}) {
  const repository = new InMemoryCompetitionDataRepository();
  const source: DataSource = {
    id: options.connectorId ?? "cli-import",
    name: "CLI import",
    kind: "manual_upload",
    mode: "human_assisted",
    official: false
  };
  const mapping = syntheticNationalCsvConfiguration.resultMappings as TableColumnMapping;
  const connectors = [];

  if (options.filePath) {
    connectors.push(
      createCsvResultsConnector({
        id: options.connectorId ?? "generic-csv",
        enabled: true,
        source,
        mapping,
        csvText: readFileSync(options.filePath, "utf8")
      })
    );
  }

  if (options.url) {
    connectors.push(
      createPublicFileUrlConnector({
        id: options.connectorId ?? "public-file",
        enabled: true,
        source: { ...source, sourceUrl: options.url },
        urls: [options.url],
        mapping
      })
    );
  }

  const engine = new CompetitionDataEngine({
    repository,
    connectors
  });

  return { engine, repository };
}
