import type { NutritionDataRepository, ProductSearchQuery } from "../adapters/repository";
import { AvailabilityEngine } from "../availability/availabilityEngine";
import { ComparisonEngine } from "../comparison/comparisonEngine";
import { ConnectorRegistry } from "../connectors/registry";
import type { ConnectorDescriptor, DiscoveryContext, NutritionDataConnector } from "../connectors/types";
import { CostEngine } from "../costs/costEngine";
import type { FeedingProgram, FeedProduct, HorseLocation, HorseProfile, IngestionRunSummary } from "../domain/types";
import type { EventPublisher } from "../events/events";
import { IngestionEngine, type IngestionRunOptions } from "../ingestion/ingestionEngine";
import { FeedingProgramEngine } from "../programs/feedingProgramEngine";
import { RecommendationEngine } from "../recommendations/recommendationEngine";
import { HorseRequirementsEngine } from "../requirements/requirementsEngine";
import { NutritionSafetyEngine } from "../safety/safetyEngine";

export interface NutritionDataEngineOptions {
  repository: NutritionDataRepository;
  connectors?: NutritionDataConnector[];
  eventPublisher?: EventPublisher;
}

export class NutritionDataEngine {
  readonly connectors = new ConnectorRegistry();
  readonly requirements = new HorseRequirementsEngine();
  readonly feedingPrograms = new FeedingProgramEngine(this.requirements);
  readonly availability = new AvailabilityEngine();
  readonly recommendations = new RecommendationEngine(this.availability);
  readonly costs = new CostEngine();
  readonly comparisons = new ComparisonEngine(this.availability, this.costs);
  readonly safety = new NutritionSafetyEngine();

  private readonly ingestion: IngestionEngine;

  constructor(private readonly options: NutritionDataEngineOptions) {
    for (const connector of options.connectors ?? []) {
      this.registerConnector(connector);
    }
    this.ingestion = new IngestionEngine({
      registry: this.connectors,
      repository: options.repository,
      eventPublisher: options.eventPublisher
    });
  }

  registerConnector(connector: NutritionDataConnector): this {
    this.connectors.register(connector);
    return this;
  }

  listConnectors(options: { enabledOnly?: boolean } = {}): ConnectorDescriptor[] {
    return this.connectors.descriptors(options);
  }

  getConnector(connectorId: string): ConnectorDescriptor | undefined {
    return this.connectors.get(connectorId)?.descriptor;
  }

  async connectorHealth(connectorId: string) {
    const connector = this.connectors.require(connectorId);
    if (connector.healthCheck) return connector.healthCheck();
    return {
      connectorId,
      status: connector.descriptor.status === "enabled" ? "healthy" : "disabled",
      checkedAt: new Date().toISOString(),
      consecutiveFailures: 0,
      message: "Connector does not expose a custom health check.",
      sourceUrls: connector.descriptor.sourceUrls
    };
  }

  async discover(context: DiscoveryContext = {}, connectorIds?: string[]) {
    return this.ingestion.discover(context, connectorIds);
  }

  async runIngestion(options: IngestionRunOptions = {}): Promise<IngestionRunSummary> {
    return this.ingestion.run(options);
  }

  async runConnector(connectorId: string, options: Omit<IngestionRunOptions, "connectorIds"> = {}): Promise<IngestionRunSummary> {
    return this.ingestion.run({ ...options, connectorIds: [connectorId] });
  }

  async listProducts(query: ProductSearchQuery = {}): Promise<FeedProduct[]> {
    return this.options.repository.listProducts(query);
  }

  async listManufacturers() {
    return this.options.repository.listManufacturers();
  }

  async searchProducts(query: ProductSearchQuery): Promise<FeedProduct[]> {
    return this.options.repository.listProducts(query);
  }

  async getProduct(productId: string): Promise<FeedProduct | undefined> {
    return this.options.repository.getProduct(productId);
  }

  async productVersions(productId: string) {
    return this.options.repository.listProductVersions?.(productId) ?? [];
  }

  async availabilityEvidence(query: { productId?: string; country?: string; staleBefore?: string } = {}) {
    return this.options.repository.listAvailabilityEvidence?.(query) ?? [];
  }

  async distributorStockists(query: { country?: string; manufacturerId?: string } = {}) {
    return this.options.repository.listDistributorStockists?.(query) ?? [];
  }

  async priceHistory(query: { productId?: string; country?: string; staleBefore?: string } = {}) {
    return this.options.repository.listPriceObservations?.(query) ?? [];
  }

  async operationalIssues(query: Parameters<NonNullable<NutritionDataRepository["listOperationalIssues"]>>[0] = {}) {
    return this.options.repository.listOperationalIssues?.(query) ?? [];
  }

  async operationalRuns(query: Parameters<NonNullable<NutritionDataRepository["listOperationalRuns"]>>[0] = {}) {
    return this.options.repository.listOperationalRuns?.(query) ?? [];
  }

  async localProducts(location: HorseLocation, products?: FeedProduct[]) {
    const candidates = products ?? (await this.options.repository.listProducts({ country: location.country, includeImported: location.allowImportedFeeds }));
    return this.availability.filterAndRank(candidates, location);
  }

  calculateRequirements(horse: HorseProfile) {
    return this.requirements.calculate(horse);
  }

  analyseFeedingProgram(program: FeedingProgram) {
    return this.feedingPrograms.analyse(program);
  }

  async recommendForProgram(program: FeedingProgram, options: { candidateProducts?: FeedProduct[]; maxRecommendations?: number } = {}) {
    const analysis = this.analyseFeedingProgram(program);
    const candidateProducts = options.candidateProducts ?? (await this.options.repository.listProducts({ includeImported: program.horse.location.allowImportedFeeds }));
    const recommendations = this.safety.annotateRecommendations(this.recommendations.recommend(analysis, { candidateProducts, maxRecommendations: options.maxRecommendations }), analysis);
    await this.options.eventPublisher?.publish({ type: "nutrition.recommendations.changed", occurredAt: new Date().toISOString(), recommendations });
    return { analysis, recommendations };
  }

  compareProducts(products: FeedProduct[], options: { nutrientKeys?: string[]; country?: string; currency?: string } = {}) {
    return this.comparisons.compareProducts(products, options);
  }
}
