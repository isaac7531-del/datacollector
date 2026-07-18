import { createHash } from "crypto";
import type { HttpClient } from "../adapters/http";
import type { DataSource, DiscoveryItem, RawCompetitionPayload } from "../domain/types";
import type {
  CollectionContext,
  CompetitionDataConnector,
  ConnectorDescriptor,
  DiscoveryContext
} from "./types";
import { DisabledConnectorError } from "./types";

export interface HttpJsonFeedEndpoint {
  id: string;
  url: string;
  label?: string;
  countryCode?: string;
  contentType?: "application/json" | "text/csv" | "text/plain";
  metadata?: Record<string, unknown>;
}

export interface HttpJsonFeedConnectorOptions {
  id: string;
  name: string;
  enabled: boolean;
  source: DataSource;
  endpoints: HttpJsonFeedEndpoint[];
  httpClient: HttpClient;
  headers?: Record<string, string>;
  complianceNote?: string;
}

export function createHttpJsonFeedConnector(options: HttpJsonFeedConnectorOptions): CompetitionDataConnector {
  const descriptor: ConnectorDescriptor = {
    id: options.id,
    name: options.name,
    status: options.enabled ? "enabled" : "disabled",
    source: options.source,
    capabilities: ["discover", "fetch_results", "fetch_entries", "fetch_rankings", "fetch_horses", "fetch_riders"],
    complianceNote:
      options.complianceNote ??
      "Collects from configured public JSON/CSV/text feed endpoints. Confirm source terms before enabling in production."
  };

  return {
    descriptor,
    async discover(context: DiscoveryContext): Promise<DiscoveryItem[]> {
      if (descriptor.status === "disabled") {
        throw new DisabledConnectorError(descriptor.id);
      }

      return options.endpoints
        .filter((endpoint) => {
          if (!context.countryCodes?.length) {
            return true;
          }

          return !endpoint.countryCode || context.countryCodes.includes(endpoint.countryCode);
        })
        .map((endpoint) => ({
          id: endpoint.id,
          connectorId: descriptor.id,
          source: options.source,
          url: endpoint.url,
          label: endpoint.label,
          countryCode: endpoint.countryCode,
          metadata: {
            ...endpoint.metadata,
            fromDate: context.fromDate,
            toDate: context.toDate
          }
        }));
    },
    async collect(item: DiscoveryItem, context: CollectionContext): Promise<RawCompetitionPayload[]> {
      if (descriptor.status === "disabled") {
        throw new DisabledConnectorError(descriptor.id);
      }

      if (!item.url) {
        throw new Error(`Discovery item "${item.id}" does not include a URL.`);
      }

      const contentType = inferContentType(item.url, options.endpoints.find((endpoint) => endpoint.id === item.id)?.contentType);
      const data =
        contentType === "application/json"
          ? await options.httpClient.getJson<unknown>(item.url, { headers: options.headers, signal: context.signal })
          : await options.httpClient.getText(item.url, { headers: options.headers, signal: context.signal });

      const serialised = typeof data === "string" ? data : JSON.stringify(data);

      return [
        {
          connectorId: descriptor.id,
          source: options.source,
          fetchedAt: new Date().toISOString(),
          data,
          contentType,
          sourceUrl: item.url,
          rawRecordId: item.id,
          checksum: createHash("sha256").update(serialised).digest("hex")
        }
      ];
    }
  };
}

function inferContentType(url: string, explicit?: HttpJsonFeedEndpoint["contentType"]): string {
  if (explicit) {
    return explicit;
  }

  if (url.endsWith(".csv")) {
    return "text/csv";
  }

  if (url.endsWith(".txt")) {
    return "text/plain";
  }

  return "application/json";
}
