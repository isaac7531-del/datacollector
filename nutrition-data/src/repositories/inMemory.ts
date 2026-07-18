import type { NutritionDataRepository, ProductSearchQuery } from "../adapters/repository";
import type { AvailabilityRecord, FeedProduct, Manufacturer, Recommendation, VersionRecord } from "../domain/types";
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

export class InMemoryNutritionDataRepository implements NutritionDataRepository {
  private readonly manufacturers = new Map<string, Manufacturer>();
  private readonly products = new Map<string, FeedProduct>();
  private readonly recommendations = new Map<string, Recommendation>();
  private readonly availabilityHistory = new Map<string, AvailabilityRecord[]>();
  private readonly productVersions = new Map<string, ImmutableProductVersion[]>();
  private readonly availabilityEvidence: AvailabilityEvidence[] = [];
  private readonly stockists = new Map<string, DistributorStockist>();
  private readonly priceObservations: PriceObservation[] = [];
  private readonly documents = new Map<string, ProductDocument>();
  private readonly relationships: ProductRelationship[] = [];
  private readonly variants = new Map<string, ProductVariantRecord>();
  private readonly operationalIssues = new Map<string, OperationalIssue>();
  private readonly operationalRuns = new Map<string, OperationalRunRecord>();
  private readonly operationalJobs = new Map<string, OperationalQueueItem>();
  private readonly checkpoints = new Map<string, string>();
  private readonly locks = new Map<string, number>();

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

  async saveProductVersion(version: ImmutableProductVersion): Promise<void> {
    const existing = this.productVersions.get(version.productId) ?? [];
    if (!existing.some((candidate) => candidate.id === version.id)) {
      existing.push(version);
      this.productVersions.set(version.productId, existing);
    }
  }

  async listProductVersions(productId: string): Promise<ImmutableProductVersion[]> {
    return this.productVersions.get(productId) ?? [];
  }

  async saveAvailabilityEvidence(evidence: AvailabilityEvidence): Promise<void> {
    this.availabilityEvidence.push(evidence);
  }

  async listAvailabilityEvidence(query: { productId?: string; country?: string; staleBefore?: string } = {}): Promise<AvailabilityEvidence[]> {
    return this.availabilityEvidence.filter((evidence) => {
      if (query.productId && evidence.productId !== query.productId) return false;
      if (query.country && evidence.country !== query.country) return false;
      if (query.staleBefore && (!evidence.expiresAt || evidence.expiresAt > query.staleBefore)) return false;
      return true;
    });
  }

  async saveDistributorStockist(stockist: DistributorStockist): Promise<void> {
    this.stockists.set(stockist.id, stockist);
  }

  async listDistributorStockists(query: { country?: string; manufacturerId?: string } = {}): Promise<DistributorStockist[]> {
    return Array.from(this.stockists.values()).filter((stockist) => {
      if (query.country && stockist.country !== query.country) return false;
      if (query.manufacturerId && !stockist.manufacturerIds.includes(query.manufacturerId)) return false;
      return true;
    });
  }

  async savePriceObservation(price: PriceObservation): Promise<void> {
    this.priceObservations.push(price);
  }

  async listPriceObservations(query: { productId?: string; country?: string; staleBefore?: string } = {}): Promise<PriceObservation[]> {
    return this.priceObservations.filter((price) => {
      if (query.productId && price.productId !== query.productId) return false;
      if (query.country && price.country !== query.country) return false;
      if (query.staleBefore && price.capturedAt > query.staleBefore) return false;
      return true;
    });
  }

  async saveProductDocument(document: ProductDocument): Promise<void> {
    this.documents.set(document.id, document);
  }

  async listProductDocuments(productId?: string): Promise<ProductDocument[]> {
    const documents = Array.from(this.documents.values());
    if (!productId) return documents;
    return documents.filter((document) => document.productIds.includes(productId));
  }

  async saveProductRelationship(relationship: ProductRelationship): Promise<void> {
    this.relationships.push(relationship);
  }

  async listProductRelationships(productId?: string): Promise<ProductRelationship[]> {
    if (!productId) return this.relationships;
    return this.relationships.filter((relationship) => relationship.sourceProductId === productId || relationship.targetProductId === productId);
  }

  async saveProductVariant(variant: ProductVariantRecord): Promise<void> {
    this.variants.set(`${variant.productId}:${variant.country}:${variant.formulationRegion ?? ""}`, variant);
  }

  async listProductVariants(productId?: string): Promise<ProductVariantRecord[]> {
    const variants = Array.from(this.variants.values());
    if (!productId) return variants;
    return variants.filter((variant) => variant.productId === productId || variant.canonicalProductId === productId);
  }

  async saveOperationalIssue(issue: OperationalIssue): Promise<void> {
    this.operationalIssues.set(issue.id, issue);
  }

  async listOperationalIssues(query: { type?: OperationalIssue["type"]; unresolvedOnly?: boolean } = {}): Promise<OperationalIssue[]> {
    return Array.from(this.operationalIssues.values()).filter((issue) => {
      if (query.type && issue.type !== query.type) return false;
      if (query.unresolvedOnly && issue.resolvedAt) return false;
      return true;
    });
  }

  async saveOperationalRun(run: OperationalRunRecord): Promise<void> {
    this.operationalRuns.set(run.id, run);
  }

  async listOperationalRuns(query: { worker?: string; status?: OperationalRunRecord["status"] } = {}): Promise<OperationalRunRecord[]> {
    return Array.from(this.operationalRuns.values()).filter((run) => {
      if (query.worker && run.worker !== query.worker) return false;
      if (query.status && run.status !== query.status) return false;
      return true;
    });
  }

  async enqueueOperationalJob(job: OperationalQueueItem): Promise<void> {
    this.operationalJobs.set(job.id, job);
  }

  async listOperationalJobs(query: { type?: OperationalQueueItem["type"]; dueBefore?: string } = {}): Promise<OperationalQueueItem[]> {
    return Array.from(this.operationalJobs.values()).filter((job) => {
      if (query.type && job.type !== query.type) return false;
      if (query.dueBefore && job.runAfter > query.dueBefore) return false;
      return true;
    });
  }

  async getCheckpoint(key: string): Promise<string | undefined> {
    return this.checkpoints.get(key);
  }

  async setCheckpoint(key: string, value: string): Promise<void> {
    this.checkpoints.set(key, value);
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    const now = Date.now();
    const expiresAt = this.locks.get(key);
    if (expiresAt && expiresAt > now) return false;
    this.locks.set(key, now + ttlMs);
    return true;
  }

  async releaseLock(key: string): Promise<void> {
    this.locks.delete(key);
  }
}

function mergeVersionHistory(existing: VersionRecord[], incoming: VersionRecord[]): VersionRecord[] {
  const byVersion = new Map<string, VersionRecord>();
  for (const version of [...existing, ...incoming]) {
    byVersion.set(`${version.version}:${version.changedAt}:${version.changeType}`, version);
  }
  return Array.from(byVersion.values()).sort((a, b) => a.changedAt.localeCompare(b.changedAt));
}
