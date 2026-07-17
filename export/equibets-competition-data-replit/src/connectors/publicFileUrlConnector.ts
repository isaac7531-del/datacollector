import { createHash } from "crypto";
import type { DataSource, DiscoveryItem, RawCompetitionPayload } from "../domain/types";
import type { TableColumnMapping } from "../normalisation/sourceNeutral";
import { normalizeSourceNeutralDocument, normalizeTableRows } from "../normalisation/sourceNeutral";
import { assertSafePublicUrl } from "../security/urlSafety";
import { parseCsvRows } from "./csvResultsConnector";
import { parseExcelRows } from "./excelResultsConnector";
import { parseSourceNeutralXml } from "./xmlResultsConnector";
import type { CollectionContext, CompetitionDataConnector, ConnectorDescriptor, DiscoveryContext, RetryPolicy } from "./types";
import { DisabledConnectorError } from "./types";

export type PublicFileFormat = "csv" | "json" | "xml" | "xlsx";

export interface PublicFileUrlConnectorOptions {
  id?: string;
  name?: string;
  enabled: boolean;
  source: DataSource;
  urls: string[];
  format?: PublicFileFormat;
  mapping?: TableColumnMapping;
  delimiter?: string;
  decimalFormat?: "dot" | "comma";
  maxBytes?: number;
  timeoutMs?: number;
  redirectLimit?: number;
  retryPolicy?: RetryPolicy;
  cacheTtlMs?: number;
  userAgent?: string;
  allowedContentTypes?: string[];
}

interface CacheEntry {
  expiresAt: number;
  payload: RawCompetitionPayload[];
}

const cache = new Map<string, CacheEntry>();

export function createPublicFileUrlConnector(options: PublicFileUrlConnectorOptions): CompetitionDataConnector {
  const connectorId = options.id ?? "public-file-url";
  const descriptor: ConnectorDescriptor = {
    id: connectorId,
    name: options.name ?? "Public file URL connector",
    status: options.enabled ? "enabled" : "disabled",
    source: options.source,
    sourceOrganisation: options.source.name,
    countryCode: options.source.countryCode,
    supportedRecordTypes: ["event", "class", "entry", "result", "phase_result", "horse", "rider", "ranking"],
    sourceAuthority: options.source.official ? "official" : "public",
    collectionMethod: "file",
    publicSourceUrlPattern: options.urls.join(","),
    rateLimit: { concurrentRequests: 1 },
    retryPolicy: options.retryPolicy,
    supportsBackfill: false,
    resultsMayBeProvisional: true,
    requiresHumanReview: !options.source.official,
    capabilities: ["discover", "fetchResults", "stage"],
    complianceNote: "Imports public HTTP/HTTPS CSV, JSON, or XML files only; no authenticated access or anti-bot circumvention."
  };

  return {
    descriptor,
    async discover(_context: DiscoveryContext): Promise<DiscoveryItem[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      return options.urls.map((url, index) => ({
        id: `public-url-${index + 1}`,
        connectorId,
        source: options.source,
        url,
        label: url
      }));
    },
    async collect(item: DiscoveryItem, _context: CollectionContext): Promise<RawCompetitionPayload[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      if (!item.url) throw new Error("Public URL discovery item is missing URL.");
      const cacheKey = `${connectorId}:${item.url}`;
      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.payload;
      }

      const fetched = await fetchPublicFile(item.url, options);
      const format = options.format ?? inferFormat(item.url, fetched.contentType);
      const data = await normalizePublicFile(fetched.body, format, options);
      const payload = [
        {
          connectorId,
          source: options.source,
          fetchedAt: new Date().toISOString(),
          data,
          contentType: "application/vnd.equibets.normalized-graph+json",
          sourceUrl: item.url,
          rawRecordId: item.id,
          checksum: createHash("sha256").update(fetched.body).digest("hex")
        }
      ];
      cache.set(cacheKey, { expiresAt: Date.now() + (options.cacheTtlMs ?? 60_000), payload });
      return payload;
    }
  };
}

export async function fetchPublicFile(urlString: string, options: PublicFileUrlConnectorOptions): Promise<{ body: Buffer; contentType: string }> {
  let current = await assertSafePublicUrl(urlString);
  const redirectLimit = options.redirectLimit ?? 3;
  const retryPolicy = options.retryPolicy ?? { maxAttempts: 2, initialDelayMs: 250, maxDelayMs: 2_000, backoffMultiplier: 2 };
  let lastError: unknown;

  for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt += 1) {
    try {
      for (let redirect = 0; redirect <= redirectLimit; redirect += 1) {
        const response = await fetchWithTimeout(current, options);
        if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
          current = await assertSafePublicUrl(new URL(response.headers.get("location") ?? "", current).toString());
          continue;
        }

        if (!response.ok) throw new Error(`Public file fetch failed with ${response.status}`);
        const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "application/octet-stream";
        validateContentType(contentType, options.allowedContentTypes);
        const contentLength = Number(response.headers.get("content-length") ?? "0");
        const maxBytes = options.maxBytes ?? 5 * 1024 * 1024;
        if (contentLength > maxBytes) throw new Error(`Public file exceeds maximum size of ${maxBytes} bytes.`);
        const body = Buffer.from(await response.arrayBuffer());
        if (body.length > maxBytes) throw new Error(`Public file exceeds maximum size of ${maxBytes} bytes.`);
        return { body, contentType };
      }

      throw new Error(`Public file exceeded redirect limit of ${redirectLimit}.`);
    } catch (error) {
      lastError = error;
      if (attempt < retryPolicy.maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(retryPolicy.initialDelayMs * retryPolicy.backoffMultiplier ** (attempt - 1), retryPolicy.maxDelayMs))
        );
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Public file fetch failed.");
}

async function normalizePublicFile(body: Buffer, format: PublicFileFormat, options: PublicFileUrlConnectorOptions) {
  const text = body.toString("utf8");
  if (format === "json") {
    return normalizeSourceNeutralDocument(JSON.parse(text), options.id ?? "public-file-url");
  }

  if (format === "xml") {
    return normalizeSourceNeutralDocument(parseSourceNeutralXml(text, options.source), options.id ?? "public-file-url");
  }

  if (format === "xlsx") {
    if (!options.mapping) throw new Error("Excel public file imports require a column mapping.");
    return normalizeTableRows(await parseExcelRows(body, { enabled: true, source: options.source, mapping: options.mapping }), {
      source: options.source,
      connectorId: options.id ?? "public-file-url",
      sourceSystem: options.source.id,
      mapping: options.mapping,
      decimalFormat: options.decimalFormat
    });
  }

  if (!options.mapping) throw new Error("CSV public file imports require a column mapping.");
  return normalizeTableRows(parseCsvRows(text, { delimiter: options.delimiter }), {
    source: options.source,
    connectorId: options.id ?? "public-file-url",
    sourceSystem: options.source.id,
    mapping: options.mapping,
    decimalFormat: options.decimalFormat
  });
}

async function fetchWithTimeout(url: URL, options: PublicFileUrlConnectorOptions): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 30_000);
  try {
    return await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": options.userAgent ?? "EquiBetsCompetitionDataEngine/0.1.0 (+public-file-import)"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

function validateContentType(contentType: string, allowed: string[] | undefined): void {
  const allowedTypes = allowed ?? [
    "text/csv",
    "application/json",
    "text/xml",
    "application/xml",
    "text/plain",
    "application/octet-stream",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ];
  if (!allowedTypes.includes(contentType)) {
    throw new Error(`Unsupported public file content type: ${contentType}`);
  }
}

function inferFormat(url: string, contentType: string): PublicFileFormat {
  const lower = url.toLocaleLowerCase("en");
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (contentType.includes("json") || lower.endsWith(".json")) return "json";
  if (contentType.includes("xml") || lower.endsWith(".xml")) return "xml";
  return "csv";
}
