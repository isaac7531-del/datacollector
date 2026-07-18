import { createHash } from "crypto";
import { readFile } from "fs/promises";
import { readSheet } from "read-excel-file/node";
import type { DataSource, DiscoveryItem, RawCompetitionPayload } from "../domain/types";
import type { TableColumnMapping, TableRow } from "../normalisation/sourceNeutral";
import { normalizeTableRows, validateMappedRow } from "../normalisation/sourceNeutral";
import type { CollectionContext, CompetitionDataConnector, ConnectorDescriptor, DiscoveryContext } from "./types";
import { DisabledConnectorError } from "./types";

export interface ExcelResultsConnectorOptions {
  id?: string;
  name?: string;
  enabled: boolean;
  source: DataSource;
  mapping: TableColumnMapping;
  filePath?: string;
  buffer?: Buffer;
  sheetName?: string;
  sheetIndex?: number;
  headerRow?: number;
  decimalFormat?: "dot" | "comma";
  headerAliases?: Record<string, string[]>;
  eventMetadata?: Parameters<typeof normalizeTableRows>[1]["eventMetadata"];
}

export function createExcelResultsConnector(options: ExcelResultsConnectorOptions): CompetitionDataConnector {
  const connectorId = options.id ?? "generic-excel";
  const descriptor: ConnectorDescriptor = {
    id: connectorId,
    name: options.name ?? "Generic Excel results connector",
    status: options.enabled ? "enabled" : "disabled",
    source: options.source,
    sourceOrganisation: options.source.name,
    countryCode: options.source.countryCode,
    supportedRecordTypes: ["event", "class", "entry", "result", "phase_result", "horse", "rider"],
    sourceAuthority: options.source.official ? "official" : "public",
    collectionMethod: options.filePath ? "file" : "upload",
    supportsBackfill: false,
    resultsMayBeProvisional: true,
    requiresHumanReview: !options.source.official,
    capabilities: ["discover", "fetchResults", "preview", "stage"],
    complianceNote: "Imports .xlsx files through staging and validation. Legacy .xls is not enabled without a safe parser."
  };

  return {
    descriptor,
    async discover(_context: DiscoveryContext): Promise<DiscoveryItem[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      return [{ id: options.filePath ?? "uploaded-excel", connectorId, source: options.source, label: descriptor.name }];
    },
    async collect(item: DiscoveryItem, _context: CollectionContext): Promise<RawCompetitionPayload[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      const bytes = await readExcelBytes(options);
      const rows = await parseExcelRows(bytes, options);
      const graphs = normalizeTableRows(rows, {
        source: options.source,
        connectorId,
        sourceSystem: options.source.id,
        mapping: options.mapping,
        decimalFormat: options.decimalFormat,
        eventMetadata: options.eventMetadata
      });

      return [
        {
          connectorId,
          source: options.source,
          fetchedAt: new Date().toISOString(),
          data: graphs,
          contentType: "application/vnd.equibets.normalized-graph+json",
          sourceUrl: options.source.sourceUrl,
          rawRecordId: item.id,
          checksum: createHash("sha256").update(bytes).digest("hex")
        }
      ];
    }
  };
}

export async function previewExcelResults(options: ExcelResultsConnectorOptions) {
  const rows = await parseExcelRows(await readExcelBytes(options), options);
  return {
    rows,
    issues: rows.flatMap((row) => validateMappedRow(row, options.mapping))
  };
}

export async function parseExcelRows(buffer: Buffer, options: ExcelResultsConnectorOptions): Promise<TableRow[]> {
  const rawRows = await readSheet(buffer, options.sheetName ?? options.sheetIndex ?? 1);
  const headerRowNumber = options.headerRow ?? 1;
  const headerRow = rawRows[headerRowNumber - 1];
  if (!headerRow) throw new Error(`Header row not found: ${headerRowNumber}`);
  const headers = headerRow.map((cell) => canonicalHeader(stringifyCell(cell), options.headerAliases));
  const rows: TableRow[] = [];

  rawRows.slice(headerRowNumber).forEach((row, rowIndex) => {
    const values: Record<string, string> = {};
    const unmapped: Record<string, string> = {};
    headers.forEach((header, index) => {
      const cellValue = stringifyCell(row[index]);
      values[header] = cellValue;
      unmapped[header] = cellValue;
    });
    rows.push({ rowNumber: rowIndex + headerRowNumber + 1, values, unmapped });
  });

  return rows;
}

async function readExcelBytes(options: ExcelResultsConnectorOptions): Promise<Buffer> {
  if (options.buffer) return options.buffer;
  if (!options.filePath) throw new Error("Excel connector requires buffer or filePath.");
  return readFile(options.filePath);
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function canonicalHeader(header: string, aliases: Record<string, string[]> | undefined): string {
  const normalized = header.trim();
  for (const [canonical, candidates] of Object.entries(aliases ?? {})) {
    if ([canonical, ...candidates].some((candidate) => candidate.toLocaleLowerCase("en") === normalized.toLocaleLowerCase("en"))) {
      return canonical;
    }
  }
  return normalized;
}

