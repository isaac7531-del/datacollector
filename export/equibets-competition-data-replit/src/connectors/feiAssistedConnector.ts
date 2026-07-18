import type { DataSource } from "../domain/types";
import type { TableColumnMapping } from "../normalisation/sourceNeutral";
import { createCsvResultsConnector } from "./csvResultsConnector";
import { createJsonResultsConnector } from "./jsonResultsConnector";
import type { CompetitionDataConnector } from "./types";

export interface FeiAssistedImportOptions {
  enabled: boolean;
  format: "csv" | "json";
  csvText?: string;
  jsonText?: string;
  filePath?: string;
  mapping?: TableColumnMapping;
  sourceUrl?: string;
}

export function createFeiAssistedImportConnector(options: FeiAssistedImportOptions): CompetitionDataConnector {
  const source: DataSource = {
    id: "fei-assisted-import",
    name: "FEI assisted import",
    kind: "fei",
    mode: "human_assisted",
    official: true,
    sourceUrl: options.sourceUrl ?? "https://inside.fei.org/"
  };

  const mapping = options.mapping ?? {
    competitionName: "event_name",
    competitionId: "fei_event_id",
    className: "class_name",
    classId: "fei_class_id",
    startDate: "start_date",
    endDate: "end_date",
    countryCode: "nation",
    venue: "venue",
    discipline: "discipline",
    horseName: "horse_name",
    horseFeiId: "fei_horse_id",
    riderName: "athlete_name",
    riderFeiId: "fei_athlete_id",
    startNumber: "start_number",
    finalScore: "final_score",
    finalPlacing: "place",
    resultStatus: "status",
    publicationStatus: "publication_status"
  };

  const connector =
    options.format === "json"
      ? createJsonResultsConnector({
          id: "fei-assisted-import",
          name: "FEI assisted JSON import",
          enabled: options.enabled,
          source,
          jsonText: options.jsonText,
          filePath: options.filePath
        })
      : createCsvResultsConnector({
          id: "fei-assisted-import",
          name: "FEI assisted CSV import",
          enabled: options.enabled,
          source,
          mapping,
          csvText: options.csvText,
          filePath: options.filePath,
          eventMetadata: { discipline: "eventing" }
        });

  connector.descriptor.complianceNote =
    "Supports FEI information supplied through public downloads, user-uploaded exports, administrator-assisted imports, and permitted public file URLs. Direct FEI page automation, CAPTCHA/DataDome bypassing, proxy rotation, stealth scraping, and browser fingerprint spoofing are not implemented.";
  connector.descriptor.requiresHumanReview = true;
  connector.descriptor.sourceAuthority = "official";
  return connector;
}

export const disabledFeiDirectPageAutomationDescriptor = {
  id: "fei-direct-page-automation",
  name: "FEI direct page automation",
  status: "disabled" as const,
  complianceNote:
    "Disabled by design. The engine does not bypass FEI technical protections such as DataDome or CAPTCHA. Use assisted import or permitted public exports instead."
};
