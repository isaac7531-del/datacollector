import { XMLParser } from "fast-xml-parser";
import type { DataSource, DiscoveryItem, Manufacturer, NormalizedNutritionPayload, RawNutritionPayload } from "../domain/types";
import { normaliseNutrientMap } from "../normalisation/nutrients";
import type { ConnectorDescriptor, DiscoveryContext, NutritionDataConnector } from "./types";

export interface PublicNutritionFeedConnectorOptions {
  id: string;
  name: string;
  manufacturer: Manufacturer;
  urls: string[];
  contentType?: "json" | "xml";
}

export function createPublicNutritionFeedConnector(options: PublicNutritionFeedConnectorOptions): NutritionDataConnector {
  const descriptor: ConnectorDescriptor = {
    id: options.id,
    manufacturer: options.manufacturer,
    name: options.name,
    countryCode: options.manufacturer.countryCode,
    regionsSupplied: options.manufacturer.regionsSupplied,
    website: options.manufacturer.website,
    supportedProducts: options.manufacturer.supportedProducts ?? [],
    updateFrequency: options.manufacturer.updateFrequency ?? "weekly",
    collectionMethod: options.contentType === "xml" ? "public_xml" : "public_json",
    productCategories: options.manufacturer.supportedProducts ?? [],
    version: "1.0.0",
    confidence: options.manufacturer.confidence,
    sourceUrls: options.urls,
    status: "enabled",
    health: "healthy"
  };

  return {
    descriptor,
    async discover(_context: DiscoveryContext = {}): Promise<DiscoveryItem[]> {
      return options.urls.map((url, index) => ({
        id: `${descriptor.id}:${index}`,
        connectorId: descriptor.id,
        source: sourceFor(descriptor, url),
        url,
        label: `${descriptor.name} feed ${index + 1}`,
        countryCode: descriptor.countryCode
      }));
    },
    async fetch(item): Promise<RawNutritionPayload[]> {
      if (!item.url) return [];
      const response = await fetch(item.url, { headers: { "user-agent": "@equibets/nutrition-data/0.1.0" } });
      if (!response.ok) throw new Error(`Unable to fetch ${item.url}: ${response.status} ${response.statusText}`);
      const text = await response.text();
      const data = parsePayload(text, options.contentType ?? inferContentType(item.url));
      return [
        {
          source: item.source,
          connectorId: descriptor.id,
          fetchedAt: new Date().toISOString(),
          data,
          contentType: response.headers.get("content-type") ?? undefined,
          sourceUrl: item.url,
          rawRecordId: item.id
        }
      ];
    },
    async normalise(payload): Promise<NormalizedNutritionPayload> {
      const raw = payload.data as { manufacturers?: Manufacturer[]; products?: Array<Record<string, unknown>> };
      const manufacturers = raw.manufacturers?.length ? raw.manufacturers : [options.manufacturer];
      const products = (raw.products ?? []).map((product) => ({
        ...product,
        manufacturerId: String(product.manufacturerId ?? options.manufacturer.id),
        manufacturerName: String(product.manufacturerName ?? options.manufacturer.name),
        nutrients: normaliseNutrientMap((product.nutrients as Record<string, number>) ?? {})
      })) as NormalizedNutritionPayload["products"];
      return {
        manufacturers,
        products,
        provenance: [
          {
            source: payload.source,
            connectorId: payload.connectorId,
            fetchedAt: payload.fetchedAt,
            sourceUrl: payload.sourceUrl,
            rawRecordId: payload.rawRecordId,
            confidence: options.manufacturer.confidence
          }
        ],
        issues: []
      };
    },
    async healthCheck() {
      return {
        connectorId: descriptor.id,
        status: descriptor.status === "enabled" ? "healthy" : "disabled",
        checkedAt: new Date().toISOString(),
        consecutiveFailures: 0,
        sourceUrls: descriptor.sourceUrls
      };
    }
  };
}

function sourceFor(descriptor: ConnectorDescriptor, url: string): DataSource {
  return {
    id: descriptor.id,
    name: descriptor.name,
    kind: descriptor.collectionMethod,
    official: true,
    countryCode: descriptor.countryCode,
    sourceUrl: url,
    robotsPolicy: "unknown"
  };
}

function parsePayload(text: string, contentType: "json" | "xml"): unknown {
  if (contentType === "xml") {
    return new XMLParser({ ignoreAttributes: false }).parse(text);
  }
  return JSON.parse(text);
}

function inferContentType(url: string): "json" | "xml" {
  return url.toLowerCase().endsWith(".xml") ? "xml" : "json";
}
