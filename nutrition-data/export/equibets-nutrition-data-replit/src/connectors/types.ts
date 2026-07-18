import type {
  CollectionMethod,
  ConnectorHealthStatus,
  ConnectorStatus,
  DiscoveryItem,
  Manufacturer,
  NormalizedNutritionPayload,
  ProductCategory,
  RawNutritionPayload
} from "../domain/types";

export interface ConnectorDescriptor {
  id: string;
  manufacturer?: Manufacturer;
  name: string;
  countryCode?: string;
  regionsSupplied: string[];
  website?: string;
  supportedProducts: ProductCategory[];
  updateFrequency: string;
  collectionMethod: CollectionMethod;
  productCategories: ProductCategory[];
  version: string;
  confidence: "low" | "medium" | "high" | "verified";
  sourceUrls: string[];
  status: ConnectorStatus;
  health: ConnectorHealthStatus;
}

export interface DiscoveryContext {
  countryCode?: string;
  region?: string;
  since?: string;
  includeDiscontinued?: boolean;
}

export interface ConnectorHealth {
  connectorId: string;
  status: ConnectorHealthStatus;
  checkedAt: string;
  consecutiveFailures: number;
  message?: string;
  sourceUrls?: string[];
}

export interface NutritionDataConnector {
  descriptor: ConnectorDescriptor;
  discover(context?: DiscoveryContext): Promise<DiscoveryItem[]>;
  fetch(item: DiscoveryItem): Promise<RawNutritionPayload[]>;
  normalise(payload: RawNutritionPayload): Promise<NormalizedNutritionPayload>;
  healthCheck?(): Promise<ConnectorHealth>;
}
