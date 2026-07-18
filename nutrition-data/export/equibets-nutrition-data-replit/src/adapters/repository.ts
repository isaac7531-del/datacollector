import type {
  AvailabilityRecord,
  FeedProduct,
  Manufacturer,
  ProductCategory,
  Recommendation,
  VersionRecord
} from "../domain/types";

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
}
