import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { XMLParser } from "fast-xml-parser";
import type { DataSource, DiscoveryItem, RawCompetitionPayload } from "../domain/types";
import { normalizeSourceNeutralDocument, type SourceNeutralImportDocument } from "../normalisation/sourceNeutral";
import type { CollectionContext, CompetitionDataConnector, ConnectorDescriptor, DiscoveryContext } from "./types";
import { DisabledConnectorError } from "./types";

export interface XmlResultsConnectorOptions {
  id?: string;
  name?: string;
  enabled: boolean;
  source: DataSource;
  xmlText?: string;
  filePath?: string;
  namespaces?: boolean;
}

export function createXmlResultsConnector(options: XmlResultsConnectorOptions): CompetitionDataConnector {
  const connectorId = options.id ?? "generic-xml";
  const descriptor: ConnectorDescriptor = {
    id: connectorId,
    name: options.name ?? "Generic XML results connector",
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
    complianceNote: "Imports source-neutral XML and maps it to JSON schema version 1.0."
  };

  return {
    descriptor,
    async discover(_context: DiscoveryContext): Promise<DiscoveryItem[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      return [{ id: options.filePath ?? "uploaded-xml", connectorId, source: options.source, label: descriptor.name }];
    },
    async collect(item: DiscoveryItem, _context: CollectionContext): Promise<RawCompetitionPayload[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      const xmlText = await readXmlText(options);
      const document = parseSourceNeutralXml(xmlText, options.source);
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
          checksum: createHash("sha256").update(xmlText).digest("hex")
        }
      ];
    }
  };
}

export async function previewXmlResults(options: XmlResultsConnectorOptions) {
  const xmlText = await readXmlText(options);
  const document = parseSourceNeutralXml(xmlText, options.source);
  return {
    competitions: document.competitions.length,
    source: document.source
  };
}

export function parseSourceNeutralXml(xmlText: string, fallbackSource: DataSource): SourceNeutralImportDocument {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    removeNSPrefix: true
  });
  const parsed = parser.parse(xmlText) as Record<string, unknown>;
  const root = (parsed.competitionData ?? parsed.CompetitionData ?? parsed) as Record<string, unknown>;
  const source = objectValue(root.source) ?? {};
  const competitionsContainer = objectValue(root.competitions) ?? root;
  const competitions = arrayValue((competitionsContainer as Record<string, unknown>).competition);

  return {
    schemaVersion: "1.0",
    source: {
      id: stringValue(source.id) ?? fallbackSource.id,
      name: stringValue(source.name) ?? fallbackSource.name,
      kind: stringValue(source.kind) ?? fallbackSource.kind,
      mode: stringValue(source.mode) ?? fallbackSource.mode,
      countryCode: stringValue(source.countryCode) ?? fallbackSource.countryCode,
      official: booleanValue(source.official) ?? fallbackSource.official,
      sourceUrl: stringValue(source.sourceUrl) ?? fallbackSource.sourceUrl
    },
    competitions: competitions.map((competition, index) => mapCompetitionXml(objectValue(competition) ?? {}, index))
  };
}

function mapCompetitionXml(record: Record<string, unknown>, index: number): SourceNeutralImportDocument["competitions"][number] {
  return {
    externalIds: [{ sourceSystem: "xml", sourceId: stringValue(record.id) ?? `competition-${index + 1}` }],
    name: stringValue(record.name) ?? `Competition ${index + 1}`,
    status: stringValue(record.status) ?? "unknown",
    discipline: stringValue(record.discipline),
    startDate: stringValue(record.startDate),
    endDate: stringValue(record.endDate),
    countryCode: stringValue(record.countryCode),
    venue: stringValue(record.venue),
    organiser: stringValue(record.organiser),
    classes: arrayFromContainer(record, "classes", "class"),
    horses: arrayFromContainer(record, "horses", "horse"),
    riders: arrayFromContainer(record, "riders", "rider"),
    entries: arrayFromContainer(record, "entries", "entry"),
    results: arrayFromContainer(record, "results", "result"),
    rankings: arrayFromContainer(record, "rankings", "ranking")
  };
}

async function readXmlText(options: XmlResultsConnectorOptions): Promise<string> {
  if (options.xmlText !== undefined) return options.xmlText;
  if (!options.filePath) throw new Error("XML connector requires xmlText or filePath.");
  return readFile(options.filePath, "utf8");
}

function arrayFromContainer(record: Record<string, unknown>, containerKey: string, itemKey = containerKey.replace(/s$/, "")): Record<string, unknown>[] {
  const container = objectValue(record[containerKey]);
  if (!container) return [];
  return arrayValue(container[itemKey]).map((value) => objectValue(value) ?? {});
}

function arrayValue(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "yes"].includes(value.toLocaleLowerCase("en"));
  return undefined;
}
