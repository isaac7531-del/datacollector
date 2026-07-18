import type { Manufacturer, NormalizedNutritionPayload, RawNutritionPayload } from "../domain/types";
import type { ConnectorDescriptor, DiscoveryContext, DiscoveryItem, NutritionDataConnector } from "./types";

export interface ManualNutritionConnectorOptions {
  id?: string;
  name?: string;
  manufacturer: Manufacturer;
  payload: NormalizedNutritionPayload;
}

export function createManualNutritionConnector(options: ManualNutritionConnectorOptions): NutritionDataConnector {
  const descriptor: ConnectorDescriptor = {
    id: options.id ?? `manual-${options.manufacturer.id}`,
    manufacturer: options.manufacturer,
    name: options.name ?? `${options.manufacturer.name} manual nutrition import`,
    countryCode: options.manufacturer.countryCode,
    regionsSupplied: options.manufacturer.regionsSupplied,
    website: options.manufacturer.website,
    supportedProducts: options.manufacturer.supportedProducts ?? [],
    updateFrequency: options.manufacturer.updateFrequency ?? "manual",
    collectionMethod: "manual",
    productCategories: options.manufacturer.supportedProducts ?? [],
    version: "1.0.0",
    confidence: options.manufacturer.confidence,
    sourceUrls: options.manufacturer.sourceUrls,
    status: "enabled",
    health: "healthy"
  };

  return {
    descriptor,
    async discover(_context: DiscoveryContext = {}): Promise<DiscoveryItem[]> {
      return [
        {
          id: `${descriptor.id}:manual-payload`,
          connectorId: descriptor.id,
          source: {
            id: descriptor.id,
            name: descriptor.name,
            kind: "manual",
            official: false,
            countryCode: descriptor.countryCode,
            sourceUrl: descriptor.sourceUrls[0],
            robotsPolicy: "not_applicable"
          },
          label: descriptor.name,
          countryCode: descriptor.countryCode
        }
      ];
    },
    async fetch(item): Promise<RawNutritionPayload[]> {
      return [
        {
          source: item.source,
          connectorId: descriptor.id,
          fetchedAt: new Date().toISOString(),
          data: options.payload,
          contentType: "application/json",
          sourceUrl: item.url,
          rawRecordId: item.id
        }
      ];
    },
    async normalise(payload: RawNutritionPayload): Promise<NormalizedNutritionPayload> {
      const data = payload.data as NormalizedNutritionPayload;
      return {
        manufacturers: data.manufacturers,
        products: data.products,
        provenance: data.provenance,
        issues: data.issues
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
