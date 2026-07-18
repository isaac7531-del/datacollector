import type { NutritionDataRepository, ProductSearchQuery } from "../adapters/repository";
import type { AvailabilityRecord, FeedProduct, Manufacturer, Recommendation, VersionRecord } from "../domain/types";

export class InMemoryNutritionDataRepository implements NutritionDataRepository {
  private readonly manufacturers = new Map<string, Manufacturer>();
  private readonly products = new Map<string, FeedProduct>();
  private readonly recommendations = new Map<string, Recommendation>();
  private readonly availabilityHistory = new Map<string, AvailabilityRecord[]>();

  async upsertManufacturer(manufacturer: Manufacturer): Promise<"created" | "updated"> {
    const action = this.manufacturers.has(manufacturer.id) ? "updated" : "created";
    this.manufacturers.set(manufacturer.id, { ...manufacturer });
    return action;
  }

  async getManufacturer(id: string): Promise<Manufacturer | undefined> {
    return this.manufacturers.get(id);
  }

  async listManufacturers(): Promise<Manufacturer[]> {
    return Array.from(this.manufacturers.values());
  }

  async upsertProduct(product: FeedProduct): Promise<"created" | "updated"> {
    const existing = this.products.get(product.id);
    const action = existing ? "updated" : "created";
    this.products.set(product.id, {
      ...product,
      versionHistory: mergeVersionHistory(existing?.versionHistory ?? [], product.versionHistory)
    });
    return action;
  }

  async getProduct(id: string): Promise<FeedProduct | undefined> {
    return this.products.get(id);
  }

  async listProducts(query: ProductSearchQuery = {}): Promise<FeedProduct[]> {
    const text = query.text?.toLowerCase();
    return Array.from(this.products.values()).filter((product) => {
      if (!query.includeDiscontinued && (product.discontinued || product.availability.discontinued)) return false;
      if (query.manufacturerId && product.manufacturerId !== query.manufacturerId) return false;
      if (query.categories?.length && !query.categories.includes(product.category)) return false;
      if (text && !`${product.name} ${product.brand ?? ""} ${product.manufacturerName}`.toLowerCase().includes(text)) return false;
      if (query.country && !product.availability.countries.includes(query.country)) {
        if (!(query.includeImported && product.availability.importAvailable)) return false;
      }
      if (query.region && product.availability.regions?.length && !product.availability.regions.includes(query.region)) return false;
      return true;
    });
  }

  async markProductDiscontinued(productId: string, version: VersionRecord): Promise<void> {
    const product = this.products.get(productId);
    if (!product) return;
    this.products.set(productId, {
      ...product,
      discontinued: true,
      availability: { ...product.availability, discontinued: true },
      versionHistory: mergeVersionHistory(product.versionHistory, [version])
    });
  }

  async saveRecommendation(recommendation: Recommendation): Promise<void> {
    this.recommendations.set(recommendation.id, recommendation);
  }

  async listRecommendations(): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values());
  }

  async recordAvailabilityChange(productId: string, availability: AvailabilityRecord): Promise<void> {
    const existing = this.availabilityHistory.get(productId) ?? [];
    existing.push(availability);
    this.availabilityHistory.set(productId, existing);
  }
}

function mergeVersionHistory(existing: VersionRecord[], incoming: VersionRecord[]): VersionRecord[] {
  const byVersion = new Map<string, VersionRecord>();
  for (const version of [...existing, ...incoming]) {
    byVersion.set(`${version.version}:${version.changedAt}:${version.changeType}`, version);
  }
  return Array.from(byVersion.values()).sort((a, b) => a.changedAt.localeCompare(b.changedAt));
}
