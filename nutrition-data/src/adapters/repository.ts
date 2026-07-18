import type {
  AvailabilityRecord,
  FeedProduct,
  Manufacturer,
  ProductCategory,
  Recommendation,
  VersionRecord
} from "../domain/types";
import type {
  AvailabilityEvidence,
  DistributorStockist,
  ImmutableProductVersion,
  OperationalIssue,
  OperationalQueueItem,
  OperationalRunRecord,
  PriceObservation,
  ProductDocument,
  ProductRelationship,
  ProductVariantRecord
} from "../operations/types";

export interface ProductSearchQuery {
  text?: string;
  country?: string;
  region?: string;
  categories?: ProductCategory[];
  includeImported?: boolean;
  includeDiscontinued?: boolean;
  manufacturerId?: string;
}

export interface NutritionDataRepository {
  upsertManufacturer(manufacturer: Manufacturer): Promise<"created" | "updated">;
  getManufacturer(id: string): Promise<Manufacturer | undefined>;
  listManufacturers(): Promise<Manufacturer[]>;

  upsertProduct(product: FeedProduct): Promise<"created" | "updated">;
  getProduct(id: string): Promise<FeedProduct | undefined>;
  listProducts(query?: ProductSearchQuery): Promise<FeedProduct[]>;
  markProductDiscontinued(productId: string, version: VersionRecord): Promise<void>;

  saveRecommendation?(recommendation: Recommendation): Promise<void>;
  listRecommendations?(): Promise<Recommendation[]>;
  recordAvailabilityChange?(productId: string, availability: AvailabilityRecord): Promise<void>;

  saveProductVersion?(version: ImmutableProductVersion): Promise<void>;
  listProductVersions?(productId: string): Promise<ImmutableProductVersion[]>;
  saveAvailabilityEvidence?(evidence: AvailabilityEvidence): Promise<void>;
  listAvailabilityEvidence?(query?: { productId?: string; country?: string; staleBefore?: string }): Promise<AvailabilityEvidence[]>;
  saveDistributorStockist?(stockist: DistributorStockist): Promise<void>;
  listDistributorStockists?(query?: { country?: string; manufacturerId?: string }): Promise<DistributorStockist[]>;
  savePriceObservation?(price: PriceObservation): Promise<void>;
  listPriceObservations?(query?: { productId?: string; country?: string; staleBefore?: string }): Promise<PriceObservation[]>;
  saveProductDocument?(document: ProductDocument): Promise<void>;
  listProductDocuments?(productId?: string): Promise<ProductDocument[]>;
  saveProductRelationship?(relationship: ProductRelationship): Promise<void>;
  listProductRelationships?(productId?: string): Promise<ProductRelationship[]>;
  saveProductVariant?(variant: ProductVariantRecord): Promise<void>;
  listProductVariants?(productId?: string): Promise<ProductVariantRecord[]>;
  saveOperationalIssue?(issue: OperationalIssue): Promise<void>;
  listOperationalIssues?(query?: { type?: OperationalIssue["type"]; unresolvedOnly?: boolean }): Promise<OperationalIssue[]>;
  saveOperationalRun?(run: OperationalRunRecord): Promise<void>;
  listOperationalRuns?(query?: { worker?: string; status?: OperationalRunRecord["status"] }): Promise<OperationalRunRecord[]>;
  enqueueOperationalJob?(job: OperationalQueueItem): Promise<void>;
  listOperationalJobs?(query?: { type?: OperationalQueueItem["type"]; dueBefore?: string }): Promise<OperationalQueueItem[]>;
  getCheckpoint?(key: string): Promise<string | undefined>;
  setCheckpoint?(key: string, value: string): Promise<void>;
  acquireLock?(key: string, ttlMs: number): Promise<boolean>;
  releaseLock?(key: string): Promise<void>;
}
