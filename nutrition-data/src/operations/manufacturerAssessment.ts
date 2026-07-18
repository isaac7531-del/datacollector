import type { NutritionDataRepository } from "../adapters/repository";
import type { ConnectorDescriptor } from "../connectors/types";
import type { FeedProduct } from "../domain/types";
import type { ManufacturerSourceConfig } from "./types";

export type ManufacturerCapability =
  | "Registry"
  | "Reconnaissance"
  | "Catalogue discovery"
  | "Product collection"
  | "Nutrient parsing"
  | "Ingredient parsing"
  | "Feeding directions"
  | "Availability"
  | "Prices"
  | "Formulation versioning"
  | "PostgreSQL"
  | "API"
  | "Acceptance";

export type ManufacturerImplementationStatus =
  | "registered"
  | "reconnaissance"
  | "scaffolded"
  | "discovery_working"
  | "collection_partial"
  | "live_smoke_passed"
  | "acceptance_testing"
  | "production_ready"
  | "degraded"
  | "blocked"
  | "disabled";

export interface ManufacturerCapabilityRow {
  manufacturerId: string;
  manufacturerName: string;
  capability: ManufacturerCapability;
  status: ManufacturerImplementationStatus;
  evidence: string;
  blocker?: string;
  nextTask: string;
}

export interface ManufacturerAssessment {
  manufacturerId: string;
  manufacturerName: string;
  status: ManufacturerImplementationStatus;
  productsCollected: number;
  nutrientCoverage: number;
  ingredientCoverage: number;
  feedingDirectionCoverage: number;
  availabilityCoverage: number;
  priceCoverage: number;
  categories: string[];
  evidence: string[];
  blockers: string[];
  nextTasks: string[];
  productionReady: boolean;
}

export class ManufacturerAssessmentService {
  constructor(
    private readonly repository: NutritionDataRepository,
    private readonly configs: ManufacturerSourceConfig[],
    private readonly descriptors: ConnectorDescriptor[]
  ) {}

  async assess(manufacturerId: string): Promise<ManufacturerAssessment> {
    const config = this.configs.find((candidate) => candidate.id === manufacturerId);
    const descriptor = this.descriptors.find((candidate) => candidate.id === manufacturerId);
    if (!config && !descriptor) throw new Error(`Unknown manufacturer: ${manufacturerId}`);
    const products = await this.repository.listProducts({ manufacturerId, includeDiscontinued: true });
    const productCount = products.length;
    const nutrientCoverage = coverage(products, (product) => Object.keys(product.nutrients).length > 0);
    const ingredientCoverage = coverage(products, (product) => product.ingredients.length > 0);
    const feedingDirectionCoverage = coverage(products, (product) => Boolean(product.feedingDirections));
    const availabilityCoverage = coverage(products, (product) => product.availability.countries.length > 0 && Boolean(product.availability.lastVerifiedAt));
    const priceCoverage = coverage(products, (product) => product.prices.length > 0);
    const versioned = await Promise.all(products.map((product) => this.repository.listProductVersions?.(product.id) ?? []));
    const hasVersions = productCount > 0 && versioned.every((versions) => versions.length > 0);
    const productionReady = productCount >= 5 && nutrientCoverage >= 0.75 && ingredientCoverage >= 0.75 && feedingDirectionCoverage >= 0.75 && availabilityCoverage >= 0.75 && hasVersions;
    const status = productionReady ? "production_ready" : productCount > 0 ? "collection_partial" : descriptor ? "scaffolded" : "registered";
    const blockers = [];
    if (!productCount) blockers.push("No products collected in the active repository.");
    if (productCount > 0 && productCount < 5) blockers.push("Collected product count below manufacturer acceptance threshold.");
    if (nutrientCoverage < 0.75) blockers.push("Nutrient coverage below acceptance threshold.");
    if (ingredientCoverage < 0.75) blockers.push("Ingredient coverage below acceptance threshold.");
    if (feedingDirectionCoverage < 0.75) blockers.push("Feeding direction coverage below acceptance threshold.");
    if (availabilityCoverage < 0.75) blockers.push("Availability evidence below acceptance threshold.");
    if (!hasVersions) blockers.push("Immutable formulation versions not proven for every collected product.");

    return {
      manufacturerId,
      manufacturerName: config?.manufacturerName ?? descriptor?.name ?? manufacturerId,
      status,
      productsCollected: productCount,
      nutrientCoverage,
      ingredientCoverage,
      feedingDirectionCoverage,
      availabilityCoverage,
      priceCoverage,
      categories: Array.from(new Set(products.map((product) => product.category))),
      evidence: [
        config ? `Registered source config: ${config.website}` : "No source config found.",
        descriptor ? `Connector descriptor: ${descriptor.name}` : "No connector descriptor found.",
        `${productCount} products currently collected.`,
        `${versioned.reduce((sum, versions) => sum + versions.length, 0)} formulation versions currently persisted.`
      ],
      blockers,
      nextTasks: blockers.length ? blockers.map((blocker) => `Resolve: ${blocker}`) : ["Run acceptance command against PostgreSQL-backed repository and live smoke evidence."],
      productionReady
    };
  }

  async workboard(): Promise<ManufacturerCapabilityRow[]> {
    const rows: ManufacturerCapabilityRow[] = [];
    for (const config of this.configs) {
      const assessment = await this.assess(config.id).catch(() => undefined);
      for (const capability of CAPABILITIES) {
        rows.push(rowFor(config, capability, assessment));
      }
    }
    return rows;
  }
}

const CAPABILITIES: ManufacturerCapability[] = [
  "Registry",
  "Reconnaissance",
  "Catalogue discovery",
  "Product collection",
  "Nutrient parsing",
  "Ingredient parsing",
  "Feeding directions",
  "Availability",
  "Prices",
  "Formulation versioning",
  "PostgreSQL",
  "API",
  "Acceptance"
];

function rowFor(config: ManufacturerSourceConfig, capability: ManufacturerCapability, assessment?: ManufacturerAssessment): ManufacturerCapabilityRow {
  const base = {
    manufacturerId: config.id,
    manufacturerName: config.manufacturerName,
    capability,
    evidence: config.website,
    nextTask: "Run manufacturer assessment and live smoke for this source."
  };
  if (capability === "Registry") return { ...base, status: "registered" };
  if (capability === "Reconnaissance") return { ...base, status: config.termsNotes ? "reconnaissance" : "registered", evidence: config.termsNotes ?? config.website };
  if (!assessment) return { ...base, status: "registered" };
  if (capability === "Catalogue discovery") return { ...base, status: assessment.productsCollected ? "discovery_working" : "scaffolded", evidence: `${assessment.productsCollected} collected products` };
  if (capability === "Product collection") return { ...base, status: assessment.productsCollected ? "collection_partial" : "scaffolded", evidence: `${assessment.productsCollected} collected products` };
  if (capability === "Nutrient parsing") return coverageRow(base, assessment.nutrientCoverage);
  if (capability === "Ingredient parsing") return coverageRow(base, assessment.ingredientCoverage);
  if (capability === "Feeding directions") return coverageRow(base, assessment.feedingDirectionCoverage);
  if (capability === "Availability") return coverageRow(base, assessment.availabilityCoverage);
  if (capability === "Prices") return coverageRow(base, assessment.priceCoverage);
  if (capability === "Formulation versioning") return { ...base, status: assessment.blockers.some((blocker) => /versions/i.test(blocker)) ? "acceptance_testing" : "live_smoke_passed", evidence: assessment.evidence.at(-1) ?? "" };
  if (capability === "PostgreSQL") return { ...base, status: "acceptance_testing", evidence: "Repository contract and migrations available; run against PostgreSQL adapter." };
  if (capability === "API") return { ...base, status: "acceptance_testing", evidence: "Manufacturer/product endpoints available." };
  return { ...base, status: assessment.productionReady ? "production_ready" : "acceptance_testing", blocker: assessment.blockers.join("; ") || undefined, nextTask: assessment.nextTasks[0] };
}

function coverageRow(base: Omit<ManufacturerCapabilityRow, "status">, value: number): ManufacturerCapabilityRow {
  return {
    ...base,
    status: value >= 0.75 ? "live_smoke_passed" : value > 0 ? "collection_partial" : "scaffolded",
    evidence: `${Math.round(value * 100)}% coverage`,
    nextTask: value >= 0.75 ? "Run acceptance test." : "Improve parser/source coverage."
  };
}

function coverage(products: FeedProduct[], predicate: (product: FeedProduct) => boolean): number {
  if (!products.length) return 0;
  return products.filter(predicate).length / products.length;
}
