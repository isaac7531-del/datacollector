import type { DataSource } from "../domain/types";
import type { NationalConnectorMapping } from "../domain/records";
import { createCsvResultsConnector } from "./csvResultsConnector";
import { createExcelResultsConnector } from "./excelResultsConnector";
import { createJsonResultsConnector } from "./jsonResultsConnector";
import { createXmlResultsConnector } from "./xmlResultsConnector";
import type { CompetitionDataConnector } from "./types";

export interface NationalResultsConnectorOptions {
  id: string;
  enabled: boolean;
  mapping: NationalConnectorMapping;
  csvText?: string;
  filePath?: string;
  buffer?: Buffer;
  jsonText?: string;
  xmlText?: string;
  sourceUrl?: string;
}

export function createNationalResultsConnector(options: NationalResultsConnectorOptions): CompetitionDataConnector {
  const source: DataSource = {
    id: options.id,
    name: options.mapping.organisationName,
    kind: "national_federation",
    mode: "official_export",
    countryCode: options.mapping.countryCode,
    official: options.mapping.authorityScore >= 70,
    sourceUrl: options.sourceUrl
  };

  if (options.mapping.fileFormat === "csv") {
    return createCsvResultsConnector({
      id: options.id,
      name: `${options.mapping.organisationName} CSV results`,
      enabled: options.enabled,
      source,
      mapping: options.mapping.resultMappings ?? {},
      csvText: options.csvText,
      filePath: options.filePath,
      delimiter: options.mapping.delimiter,
      encoding: options.mapping.encoding,
      decimalFormat: options.mapping.decimalFormat,
      headerAliases: options.mapping.headerAliases,
      eventMetadata: {
        countryCode: options.mapping.countryCode,
        discipline: options.mapping.discipline
      }
    });
  }

  if (options.mapping.fileFormat === "excel") {
    return createExcelResultsConnector({
      id: options.id,
      name: `${options.mapping.organisationName} Excel results`,
      enabled: options.enabled,
      source,
      mapping: options.mapping.resultMappings ?? {},
      filePath: options.filePath,
      buffer: options.buffer,
      decimalFormat: options.mapping.decimalFormat,
      headerAliases: options.mapping.headerAliases,
      eventMetadata: {
        countryCode: options.mapping.countryCode,
        discipline: options.mapping.discipline
      }
    });
  }

  if (options.mapping.fileFormat === "json") {
    return createJsonResultsConnector({
      id: options.id,
      name: `${options.mapping.organisationName} JSON results`,
      enabled: options.enabled,
      source,
      jsonText: options.jsonText,
      filePath: options.filePath
    });
  }

  return createXmlResultsConnector({
    id: options.id,
    name: `${options.mapping.organisationName} XML results`,
    enabled: options.enabled,
    source,
    xmlText: options.xmlText,
    filePath: options.filePath
  });
}

export const syntheticNationalCsvConfiguration: NationalConnectorMapping = {
  organisationName: "Synthetic National Eventing Federation",
  countryCode: "AU",
  discipline: "eventing",
  authorityScore: 90,
  fileFormat: "csv",
  encoding: "utf8",
  delimiter: ",",
  dateFormat: "YYYY-MM-DD",
  timeFormat: "mm:ss",
  decimalFormat: "dot",
  headerAliases: {
    horse_name: ["Horse", "Horse Name"],
    rider_name: ["Rider", "Athlete"],
    final_score: ["Final Score"],
    final_place: ["Place", "Final Place"]
  },
  eventMappings: {
    competitionName: "event_name",
    startDate: "start_date",
    venue: "venue"
  },
  resultMappings: {
    competitionName: "event_name",
    className: "class_name",
    startDate: "start_date",
    countryCode: "country",
    venue: "venue",
    horseName: "horse_name",
    horseId: "horse_reg",
    riderName: "rider_name",
    riderId: "rider_member",
    startNumber: "start_number",
    finalScore: "final_score",
    finalPlacing: "final_place",
    resultStatus: "status",
    dressageScore: "dressage_score",
    crossCountryJumpingPenalties: "xc_jump_pen",
    crossCountryTimePenalties: "xc_time_pen",
    showjumpingJumpingPenalties: "sj_jump_pen",
    showjumpingTimePenalties: "sj_time_pen",
    publicationStatus: "publication_status"
  },
  sourceUrlPatterns: ["https://example-national.invalid/results/*.csv"],
  provisionalResultRules: ["publication_status=provisional"],
  finalResultRules: ["publication_status=final"]
};

export const syntheticNationalExcelConfiguration: NationalConnectorMapping = {
  ...syntheticNationalCsvConfiguration,
  organisationName: "Synthetic State Showjumping Association",
  countryCode: "NZ",
  discipline: "jumping",
  authorityScore: 70,
  fileFormat: "excel",
  sourceUrlPatterns: ["https://example-state.invalid/exports/*.xlsx"]
};
