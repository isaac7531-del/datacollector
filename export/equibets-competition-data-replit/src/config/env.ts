import type { DataSource, DataSourceKind, IngestionMode } from "../domain/types";

export interface CompetitionDataEnvConfig {
  importBatchPrefix: string;
  defaultCountryCodes: string[];
  connectors: Record<string, ConnectorEnvConfig>;
}

export interface ConnectorEnvConfig {
  enabled: boolean;
  source: DataSource;
  endpointUrls: string[];
  headers: Record<string, string>;
}

export interface EnvReader {
  [key: string]: string | undefined;
}

const DEFAULT_PREFIX = "EQUIBETS_COMPETITION_DATA";

export function loadCompetitionDataEnv(env: EnvReader = process.env, prefix = DEFAULT_PREFIX): CompetitionDataEnvConfig {
  const connectorIds = splitCsv(env[`${prefix}_CONNECTORS`]);

  return {
    importBatchPrefix: env[`${prefix}_BATCH_PREFIX`] ?? "competition-data",
    defaultCountryCodes: splitCsv(env[`${prefix}_DEFAULT_COUNTRIES`]),
    connectors: Object.fromEntries(connectorIds.map((connectorId) => [connectorId, readConnector(env, prefix, connectorId)]))
  };
}

function readConnector(env: EnvReader, prefix: string, connectorId: string): ConnectorEnvConfig {
  const envKey = connectorId.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const sourceId = env[`${prefix}_${envKey}_SOURCE_ID`] ?? connectorId;
  const sourceName = env[`${prefix}_${envKey}_SOURCE_NAME`] ?? connectorId;
  const sourceKind = (env[`${prefix}_${envKey}_SOURCE_KIND`] ?? "other_public") as DataSourceKind;
  const mode = (env[`${prefix}_${envKey}_MODE`] ?? "public_file") as IngestionMode;

  return {
    enabled: parseBoolean(env[`${prefix}_${envKey}_ENABLED`], false),
    source: {
      id: sourceId,
      name: sourceName,
      kind: sourceKind,
      mode,
      countryCode: env[`${prefix}_${envKey}_COUNTRY`],
      official: parseBoolean(env[`${prefix}_${envKey}_OFFICIAL`], false),
      sourceUrl: env[`${prefix}_${envKey}_SOURCE_URL`]
    },
    endpointUrls: splitCsv(env[`${prefix}_${envKey}_ENDPOINTS`]),
    headers: readHeaders(env, `${prefix}_${envKey}_HEADER_`)
  };
}

function readHeaders(env: EnvReader, headerPrefix: string): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith(headerPrefix) || value === undefined) {
      continue;
    }

    const headerName = key.slice(headerPrefix.length).replace(/_/g, "-");
    headers[headerName] = value;
  }

  return headers;
}

function splitCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on", "enabled"].includes(value.toLocaleLowerCase("en"));
}
