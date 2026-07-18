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
import type {
  AvailabilityEvidence,
  DistributorStockist,
  FeedingRule,
  IngredientFact,
  OperationalConnectorTelemetry,
  ProductDocument
} from "../operations/types";

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
  telemetry?: OperationalConnectorTelemetry;
}

export interface NutritionDataConnector {
  descriptor: ConnectorDescriptor;
  discover(context?: DiscoveryContext): Promise<DiscoveryItem[]>;
  fetch(item: DiscoveryItem): Promise<RawNutritionPayload[]>;
  normalise(payload: RawNutritionPayload): Promise<NormalizedNutritionPayload>;
  healthCheck?(): Promise<ConnectorHealth>;
}

export interface OperationalManufacturerConnector extends NutritionDataConnector {
  telemetry(): OperationalConnectorTelemetry;
  discoverRegions?(context?: DiscoveryContext): Promise<string[]>;
  discoverCategories?(context?: DiscoveryContext): Promise<ProductCategory[]>;
  discoverProducts?(context?: DiscoveryContext): Promise<DiscoveryItem[]>;
  fetchProduct?(item: DiscoveryItem): Promise<RawNutritionPayload[]>;
  fetchNutritionDocuments?(item: DiscoveryItem): Promise<ProductDocument[]>;
  fetchAvailability?(item: DiscoveryItem): Promise<AvailabilityEvidence[]>;
  fetchDistributors?(context?: DiscoveryContext): Promise<DistributorStockist[]>;
  parseProduct?(payload: RawNutritionPayload): Promise<NormalizedNutritionPayload>;
  parseNutrients?(text: string, sourceUrl: string): Promise<NormalizedNutritionPayload["products"][number]["nutrients"]>;
  parseIngredients?(text: string, sourceUrl: string): Promise<IngredientFact[]>;
  parseFeedingDirections?(text: string, productId: string, sourceUrl: string): Promise<FeedingRule[]>;
  parseWarnings?(text: string): Promise<string[]>;
  parsePackaging?(text: string): Promise<Array<{ size: number; unit: "kg" | "g" | "lb" | "l" | "ml"; label?: string }>>;
  determineProductState?(payload: RawNutritionPayload): Promise<"active" | "discontinued" | "replaced" | "unknown">;
  determineNextCheckTime?(payload: RawNutritionPayload): Promise<string>;
}
