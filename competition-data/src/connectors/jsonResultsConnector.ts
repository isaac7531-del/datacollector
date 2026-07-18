import { createHash } from "crypto";
import { readFile } from "fs/promises";
import type { DataSource, DiscoveryItem, RawCompetitionPayload } from "../domain/types";
import { normalizeSourceNeutralDocument, sourceNeutralImportSchema } from "../normalisation/sourceNeutral";
import type { CollectionContext, CompetitionDataConnector, ConnectorDescriptor, DiscoveryContext } from "./types";
import { DisabledConnectorError } from "./types";

export interface JsonResultsConnectorOptions {
  id?: string;
  name?: string;
  enabled: boolean;
  source: DataSource;
  jsonText?: string;
  document?: unknown;
  filePath?: string;
}

export function createJsonResultsConnector(options: JsonResultsConnectorOptions): CompetitionDataConnector {
  const connectorId = options.id ?? "generic-json";
  const descriptor: ConnectorDescriptor = {
    id: connectorId,
    name: options.name ?? "Generic JSON results connector",
    status: options.enabled ? "enabled" : "disabled",
    source: options.source,
    sourceOrganisation: options.source.name,
    countryCode: options.source.countryCode,
    supportedRecordTypes: ["event", "class", "entry", "result", "phase_result", "horse", "rider", "ranking"],
    sourceAuthority: options.source.official ? "official" : "public",
    collectionMethod: options.filePath ? "file" : "upload",
    supportsBackfill: false,
    resultsMayBeProvisional: true,
    requiresHumanReview: !options.source.official,
    capabilities: ["discover", "fetchResults", "preview", "stage"],
    complianceNote: "Imports documented source-neutral JSON schema version 1.0."
  };

  return {
    descriptor,
    async discover(_context: DiscoveryContext): Promise<DiscoveryItem[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      return [{ id: options.filePath ?? "uploaded-json", connectorId, source: options.source, label: descriptor.name }];
    },
    async collect(item: DiscoveryItem, _context: CollectionContext): Promise<RawCompetitionPayload[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      const document = await readJsonDocument(options);
      const graphs = normalizeSourceNeutralDocument(document, connectorId);
      return [
        {
          connectorId,
          source: options.source,
          fetchedAt: new Date().toISOString(),
          data: graphs,
          contentType: "application/vnd.equibets.normalized-graph+json",
          sourceUrl: options.source.sourceUrl,
          rawRecordId: item.id,
          checksum: createHash("sha256").update(JSON.stringify(document)).digest("hex")
        }
      ];
    }
  };
}

export async function previewJsonResults(options: JsonResultsConnectorOptions) {
  const document = await readJsonDocument(options);
  const validation = sourceNeutralImportSchema.safeParse(document);
  return {
    valid: validation.success,
    issues: validation.success
      ? []
      : validation.error.issues.map((issue) => ({
          code: "json.schema.invalid",
          message: issue.message,
          severity: "error" as const,
          path: issue.path.join(".")
        }))
  };
}

async function readJsonDocument(options: JsonResultsConnectorOptions): Promise<unknown> {
  if (options.document !== undefined) return options.document;
  if (options.jsonText !== undefined) return JSON.parse(options.jsonText);
  if (!options.filePath) throw new Error("JSON connector requires document, jsonText or filePath.");
  return JSON.parse(await readFile(options.filePath, "utf8"));
}
