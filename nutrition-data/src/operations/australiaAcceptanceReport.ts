import type { NutritionDataEngine } from "../service/NutritionDataEngine";

export const AUSTRALIAN_ACCEPTANCE_MANUFACTURERS = ["mitavite-au", "hygain-au", "prydes-au", "barastoc-au", "coprice-au"] as const;

export interface AustralianManufacturerAcceptanceRow {
  manufacturerId: string;
  productsDiscovered?: number;
  productsAccepted: number;
  nutrientCoverage: number;
  ingredientCoverage: number;
  feedingDirectionCoverage: number;
  parserConfidence: string;
  formulationVersions: number;
  postgreSqlVerification: "not_run" | "migration_only" | "passed";
  remainingBlockers: string[];
}

export async function buildAustralianAcceptanceReport(engine: NutritionDataEngine): Promise<{
  generatedAt: string;
  manufacturers: AustralianManufacturerAcceptanceRow[];
  productionReadyCount: number;
  note: string;
}> {
  const manufacturers: AustralianManufacturerAcceptanceRow[] = [];
  for (const manufacturerId of AUSTRALIAN_ACCEPTANCE_MANUFACTURERS) {
    const status = await engine.manufacturerStatus(manufacturerId);
    const discovered = await engine.discover({}, [manufacturerId]).catch(() => []);
    const products = await engine.listProducts({ manufacturerId, includeDiscontinued: true });
    const versions = await Promise.all(products.map((product) => engine.productVersions(product.id)));
    const remainingBlockers = [
      ...status.blockers,
      "PostgreSQL-backed persistence not proven in this runtime."
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
      postgreSqlVerification: "migration_only",
      remainingBlockers
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    manufacturers,
    productionReadyCount: manufacturers.filter((row) => row.remainingBlockers.length === 0 && row.postgreSqlVerification === "passed").length,
    note: "PostgreSQL verification is migration-only until a persistent repository adapter is supplied by the integration environment."
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
