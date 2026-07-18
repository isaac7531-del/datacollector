import type { NutritionDataRepository } from "../adapters/repository";
import type { NutritionDataEngine } from "../service/NutritionDataEngine";
import type { OperationalRunRecord } from "../operations/types";

export type OperationalWorkerName =
  | "discovery"
  | "products"
  | "documents"
  | "availability"
  | "distributors"
  | "prices"
  | "formulations"
  | "stale-data"
  | "recalculate"
  | "outbox";

export interface OperationalWorkerResult {
  worker: OperationalWorkerName;
  runId: string;
  summary: Record<string, unknown>;
}

export class OperationalWorkerRunner {
  constructor(private readonly engine: NutritionDataEngine, private readonly repository: NutritionDataRepository) {}

  async run(worker: OperationalWorkerName, options: { connectorId?: string; country?: string; productId?: string } = {}): Promise<OperationalWorkerResult> {
    const lockKey = `nutrition-worker:${worker}:${options.connectorId ?? options.country ?? options.productId ?? "all"}`;
    const acquired = await this.repository.acquireLock?.(lockKey, 15 * 60 * 1000);
    if (acquired === false) throw new Error(`Worker lock is already held: ${lockKey}`);
    const runId = `${worker}-${Date.now()}`;
    const startedAt = new Date().toISOString();
    const run: OperationalRunRecord = { id: runId, worker, status: "running", startedAt, checkpointKey: lockKey };
    await this.repository.saveOperationalRun?.(run);
    try {
      const summary = await this.execute(worker, options);
      await this.repository.setCheckpoint?.(lockKey, new Date().toISOString());
      await this.repository.saveOperationalRun?.({ ...run, status: "succeeded", finishedAt: new Date().toISOString(), summary });
      return { worker, runId, summary };
    } catch (error) {
      await this.repository.saveOperationalRun?.({ ...run, status: "failed", finishedAt: new Date().toISOString(), error: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      await this.repository.releaseLock?.(lockKey);
    }
  }

  private async execute(worker: OperationalWorkerName, options: { connectorId?: string; country?: string; productId?: string }): Promise<Record<string, unknown>> {
    if (worker === "discovery") {
      const items = await this.engine.discover(options.country ? { countryCode: options.country } : {}, options.connectorId ? [options.connectorId] : undefined);
      return { discovered: items.length, connectorId: options.connectorId, country: options.country };
    }
    if (worker === "products") {
      return { ...(await this.engine.runIngestion({ connectorIds: options.connectorId ? [options.connectorId] : undefined, discovery: options.country ? { countryCode: options.country } : undefined })) };
    }
    if (worker === "availability") {
      const evidence = await this.engine.availabilityEvidence({ country: options.country });
      return { evidence: evidence.length, country: options.country };
    }
    if (worker === "prices") {
      const staleBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const stale = await this.engine.priceHistory({ country: options.country, staleBefore });
      return { stalePrices: stale.length, country: options.country, staleBefore };
    }
    if (worker === "formulations") {
      const products = await this.engine.listProducts({});
      const changed = await Promise.all(products.map((product) => this.engine.productVersions(product.id)));
      return { products: products.length, versionedProducts: changed.filter((versions) => versions.length > 1).length };
    }
    if (worker === "stale-data") {
      const staleBefore = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const staleAvailability = await this.engine.availabilityEvidence({ country: options.country, staleBefore });
      return { staleAvailability: staleAvailability.length, staleBefore };
    }
    if (worker === "recalculate") return { queuedRecommendationRecalculations: 0, note: "Integration host supplies private ration IDs." };
    if (worker === "outbox") return { delivered: 0, note: "Outbox delivery adapter is integration-host owned." };
    if (worker === "documents" || worker === "distributors") return { processed: 0, note: "No document/distributor refresh jobs due in in-memory runner." };
    return {};
  }
}
