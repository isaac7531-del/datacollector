import type {
  CollectionMethod,
  ConfidenceLevel,
  CountryCode,
  CurrencyCode,
  FeedProduct,
  ISODateString,
  ISODateTimeString,
  NutrientBasis,
  NutrientUnit,
  ProductCategory,
  Workload
} from "../domain/types";

export type AcquisitionMode =
  | "fully_automated"
  | "document_assisted"
  | "administrator_assisted"
  | "manufacturer_supplied"
  | "unavailable"
  | "unsupported";

export type VerificationState = "unverified" | "partially_verified" | "manufacturer_sourced" | "multi_source_verified" | "stale" | "disputed" | "archived";
export type AvailabilityEvidenceType = "officially_marketed" | "officially_distributed" | "retailer_confirmed" | "import_only" | "historical" | "inferred" | "unknown" | "unavailable";
export type ProductRelationshipType = "replaces" | "replaced_by" | "regional_variant_of" | "packaging_variant_of" | "renamed_from" | "equivalent_to" | "comparable_to";
export type ProductChangeClassification =
  | "cosmetic"
  | "packaging"
  | "feeding_guidance"
  | "formulation"
  | "nutrient_declaration"
  | "availability"
  | "discontinued"
  | "replacement_product";

export interface ConfidenceBreakdown {
  identity: ConfidenceLevel;
  nutrientData: ConfidenceLevel;
  feedingDirections: ConfidenceLevel;
  ingredients: ConfidenceLevel;
  availability: ConfidenceLevel;
  price: ConfidenceLevel;
  explanation: string[];
}

export interface SourceReconnaissance {
  manufacturer: string;
  country: CountryCode;
  website: string;
  catalogueStructure: string;
  productCountEstimate: string;
  publicNutrientDataQuality: "none" | "partial" | "good" | "excellent";
  feedingRateAvailability: "none" | "partial" | "most_products" | "all_products";
  ingredientsAvailability: "none" | "partial" | "most_products" | "all_products";
  geographicalInformation: string;
  downloadablePdfs: string;
  rendering: "static_html" | "client_rendered" | "mixed" | "unknown";
  structuredData: string;
  robotsAndTermsObservations: string;
  recommendedConnectorMode: AcquisitionMode;
  implementationPriority: "p0" | "p1" | "p2" | "backlog" | "unsupported";
  notes: string;
}

export interface ManufacturerSourceConfig {
  id: string;
  manufacturerName: string;
  headquartersCountry: CountryCode;
  website: string;
  countriesMarketed: CountryCode[];
  countriesOfficiallyDistributed: CountryCode[];
  defaultCurrency?: CurrencyCode;
  acquisitionMode: AcquisitionMode;
  collectionMethod: CollectionMethod;
  productCategories: ProductCategory[];
  catalogueUrls: string[];
  sitemapUrls?: string[];
  productUrlPatterns: string[];
  excludeProductUrlPatterns?: string[];
  fallbackProductUrls?: string[];
  distributorUrls?: string[];
  stockistUrls?: string[];
  documentUrlPatterns?: string[];
  expectedRefreshDays: number;
  termsNotes?: string;
}

export interface OperationalConnectorTelemetry {
  acquisitionMode: AcquisitionMode;
  supportedCountries: CountryCode[];
  supportedProductCategories: ProductCategory[];
  lastSuccessfulDiscovery?: ISODateTimeString;
  lastSuccessfulProductFetch?: ISODateTimeString;
  parseCoverage: number;
  nutrientCoverage: number;
  availabilityCoverage: number;
  currentLimitation?: string;
}

export interface LiveProductSeed {
  sourceProductId: string;
  productUrl: string;
  manufacturerId: string;
  manufacturerName: string;
  headquartersCountry: CountryCode;
  countriesMarketed: CountryCode[];
  countriesOfficiallyDistributed: CountryCode[];
  category: ProductCategory;
  acquisitionMode: AcquisitionMode;
}

export interface ProductIdentityKey {
  manufacturerId: string;
  brand?: string;
  productName: string;
  productCode?: string;
  barcode?: string;
  sku?: string;
  country: CountryCode;
  formulationRegion?: string;
  packageSize?: string;
  productType?: ProductCategory;
  sourceIdentifier?: string;
}

export interface ProductRelationship {
  sourceProductId: string;
  targetProductId: string;
  type: ProductRelationshipType;
  evidenceUrl?: string;
  confidence: ConfidenceLevel;
  note?: string;
}

export interface ProductVariantRecord {
  productId: string;
  canonicalProductId: string;
  country: CountryCode;
  formulationRegion?: string;
  localName?: string;
  localPackaging?: string[];
  localCurrency?: CurrencyCode;
  differsFromCanonical: boolean;
  differenceSummary?: string;
}

export interface AvailabilityEvidence {
  productId: string;
  country: CountryCode;
  region?: string;
  evidenceType: AvailabilityEvidenceType;
  sourceUrl: string;
  sourceName?: string;
  verifiedAt: ISODateTimeString;
  expiresAt?: ISODateTimeString;
  confidence: ConfidenceLevel;
  deliveryMode?: "online_delivery" | "physical_stockist" | "distributor" | "manufacturer_direct" | "unknown";
  note?: string;
}

export interface DistributorStockist {
  id: string;
  name: string;
  type: "distributor" | "retailer" | "stockist";
  country: CountryCode;
  region?: string;
  locality?: string;
  deliveryAreas?: string[];
  online: boolean;
  physical: boolean;
  manufacturerIds: string[];
  sourceUrl: string;
  lastVerifiedAt: ISODateTimeString;
  confidence: ConfidenceLevel;
}

export interface ProductDocument {
  id: string;
  productIds: string[];
  url: string;
  checksum: string;
  capturedAt: ISODateTimeString;
  documentDate?: ISODateString;
  parserVersion: string;
  pages?: number[];
  extractionMethod: "embedded_text" | "structured_table" | "layout_aware" | "ocr_required" | "unsupported";
  confidence: ConfidenceLevel;
  textExcerpt?: string;
}

export interface ExtractedNutrientFact {
  canonicalKey: string;
  originalLabel: string;
  originalValue: string;
  originalUnit?: string;
  declaredBasis: NutrientBasis;
  normalizedValue: number;
  normalizedUnit: NutrientUnit;
  conversionMethod: string;
  declarationType: "declared_analysis" | "typical_analysis" | "minimum" | "maximum" | "calculated" | "inferred" | "laboratory_result" | "manufacturer_claim";
  sourceUrl: string;
  sourceText: string;
  confidence: ConfidenceLevel;
}

export interface IngredientFact {
  canonicalName: string;
  originalName: string;
  order?: number;
  percentage?: number;
  taxonomyGroup: IngredientTaxonomyGroup;
  aliases: string[];
  sourceUrl?: string;
  confidence: ConfidenceLevel;
}

export type IngredientTaxonomyGroup =
  | "grain"
  | "fibre"
  | "protein_meal"
  | "oil"
  | "molasses"
  | "mineral"
  | "vitamin"
  | "probiotic"
  | "yeast"
  | "herb"
  | "binder"
  | "preservative"
  | "flavouring"
  | "controlled_component"
  | "other";

export interface ProductClaim {
  key:
    | "cereal_free"
    | "molasses_free"
    | "soy_free"
    | "lucerne_free"
    | "grain_free"
    | "fortified"
    | "medicated"
    | "prohibited_substance_warning"
    | "competition_safe_claim"
    | "gmo_claim"
    | "organic_claim";
  value: boolean | string;
  sourceText: string;
  sourceUrl?: string;
  confidence: ConfidenceLevel;
}

export interface FeedingRule {
  id: string;
  productId: string;
  condition: {
    workload?: Workload | "racing" | "breeding" | "pregnancy" | "lactation" | "youngstock" | "pony" | "senior" | "weight_gain" | "weight_loss";
    minBodyWeightKg?: number;
    maxBodyWeightKg?: number;
    horseClass?: string;
  };
  amount: {
    min: number;
    max?: number;
    unit: "kg" | "g" | "lb" | "oz" | "scoop" | "serving";
    per?: "day" | "100kg_bodyweight" | "meal";
  };
  originalText: string;
  sourceUrl?: string;
  confidence: ConfidenceLevel;
}

export interface PriceObservation {
  productId: string;
  amount: number;
  currency: CurrencyCode;
  packageSize: string;
  retailer?: string;
  country: CountryCode;
  promotional: boolean;
  capturedAt: ISODateTimeString;
  validUntil?: ISODateTimeString;
  taxIncluded?: boolean;
  deliveryExcluded?: boolean;
  confidence: ConfidenceLevel;
  sourceUrl: string;
}

export interface ImmutableProductVersion {
  id: string;
  productId: string;
  version: string;
  capturedAt: ISODateTimeString;
  sourceChecksum: string;
  product: FeedProduct;
  changeClassification?: ProductChangeClassification;
  changedFields: string[];
  previousVersionId?: string;
}

export interface RequirementStandardReference {
  id: string;
  name: "NRC" | "UK_EU_REFERENCE" | "MANUFACTURER_GUIDANCE" | "EXPERT_RULE";
  version: string;
  jurisdiction?: string;
  sourceUrl?: string;
  limitation: string;
}

export interface OperationalRunRecord {
  id: string;
  worker: string;
  status: "running" | "succeeded" | "failed";
  startedAt: ISODateTimeString;
  finishedAt?: ISODateTimeString;
  checkpointKey?: string;
  summary?: Record<string, unknown>;
  error?: string;
}

export interface OperationalQueueItem {
  id: string;
  type:
    | "manufacturer_discovery"
    | "product_refresh"
    | "document_refresh"
    | "availability_refresh"
    | "distributor_refresh"
    | "price_refresh"
    | "formulation_detection"
    | "stale_data_review"
    | "recommendation_recalculation"
    | "outbox_delivery";
  targetId?: string;
  runAfter: ISODateTimeString;
  attempts: number;
  payload?: Record<string, unknown>;
}

export interface OperationalIssue {
  id: string;
  type:
    | "unresolved_nutrient_label"
    | "unresolved_ingredient"
    | "ambiguous_product"
    | "duplicate_candidate"
    | "regional_variant"
    | "missing_unit"
    | "unavailable_feeding_directions"
    | "stale_availability"
    | "changed_formulation"
    | "discontinued_product"
    | "document_parse_failure";
  severity: "info" | "warning" | "error";
  targetId?: string;
  message: string;
  sourceUrl?: string;
  createdAt: ISODateTimeString;
  resolvedAt?: ISODateTimeString;
}
