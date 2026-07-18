import type { NutritionDataEngine } from "../service/NutritionDataEngine";

export const UK_IRELAND_ACCEPTANCE_MANUFACTURERS = [
  "dengie-gb",
  "dodson-horrell-gb",
  "baileys-gb",
  "saracen-gb",
  "allen-page-gb",
  "keyflow-gb"
] as const;

export interface UkIrelandManufacturerAcceptanceRow {
  manufacturerId: string;
  productsDiscovered?: number;
  productsAccepted: number;
  nutrientCoverage: number;
  ingredientCoverage: number;
  feedingDirectionCoverage: number;
  parserConfidence: string;
  formulationVersions: number;
  postgreSqlVerification: "not_run" | "migration_only" | "passed";
  mobileApiReady: boolean;
  remainingBlockers: string[];
}

export async function buildUkIrelandAcceptanceReport(engine: NutritionDataEngine, options: { postgreSqlVerified?: boolean } = {}): Promise<{
  generatedAt: string;
  manufacturers: UkIrelandManufacturerAcceptanceRow[];
  productionReadyCount: number;
  acceptanceTestingCount: number;
  blockedCount: number;
  note: string;
}> {
  const manufacturers: UkIrelandManufacturerAcceptanceRow[] = [];
  for (const manufacturerId of UK_IRELAND_ACCEPTANCE_MANUFACTURERS) {
    const status = await engine.manufacturerStatus(manufacturerId);
    const discovered = await engine.discover({}, [manufacturerId]).catch(() => []);
    const products = await engine.listProducts({ manufacturerId, includeDiscontinued: true });
    const versions = await Promise.all(products.map((product) => engine.productVersions(product.id)));
    const postgreSqlVerification = options.postgreSqlVerified ? "passed" : "migration_only";
    const remainingBlockers = [
      ...status.blockers,
      ...(options.postgreSqlVerified ? [] : ["PostgreSQL-backed persistence not proven in this runtime."])
    ];
    manufacturers.push({
      manufacturerId,
      productsDiscovered: discovered.length,
      productsAccepted: status.productsCollected,
      nutrientCoverage: round(status.nutrientCoverage),
      ingredientCoverage: round(status.ingredientCoverage),
      feedingDirectionCoverage: round(status.feedingDirectionCoverage),
      parserConfidence: parserConfidence(status.nutrientCoverage, status.ingredientCoverage, status.feedingDirectionCoverage),
      formulationVersions: versions.reduce((sum, productVersions) => sum + productVersions.length, 0),
      postgreSqlVerification,
      mobileApiReady: products.length > 0 && products.every((product) => product.id && product.name && product.availability.countries.length),
      remainingBlockers
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    manufacturers,
    productionReadyCount: manufacturers.filter((row) => row.remainingBlockers.length === 0 && row.postgreSqlVerification === "passed").length,
    acceptanceTestingCount: manufacturers.filter((row) => row.remainingBlockers.length > 0 && row.productsDiscovered).length,
    blockedCount: manufacturers.filter((row) => !row.productsDiscovered).length,
    note: options.postgreSqlVerified
      ? "PostgreSQL verification was supplied by the live UK/Ireland PostgreSQL acceptance command."
      : "PostgreSQL verification is migration-only until live PostgreSQL acceptance is run."
  };
}

function parserConfidence(nutrients: number, ingredients: number, feeding: number): string {
  const score = (nutrients + ingredients + feeding) / 3;
  if (score >= 0.9) return "high";
  if (score >= 0.6) return "medium";
  if (score > 0) return "low";
  return "unverified";
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
