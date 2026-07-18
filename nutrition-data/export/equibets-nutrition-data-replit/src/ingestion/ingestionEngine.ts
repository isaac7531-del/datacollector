import type { NutritionDataRepository } from "../adapters/repository";
import type { DataQualityIssue, FeedProduct, IngestionRunSummary } from "../domain/types";
import type { EventPublisher } from "../events/events";
import { noopEventPublisher } from "../events/events";
import type { ConnectorRegistry } from "../connectors/registry";
import type { DiscoveryContext } from "../connectors/types";

export interface IngestionEngineOptions {
  registry: ConnectorRegistry;
  repository: NutritionDataRepository;
  eventPublisher?: EventPublisher;
}

export interface IngestionRunOptions {
  connectorIds?: string[];
  discovery?: DiscoveryContext;
  dryRun?: boolean;
}

export class IngestionEngine {
  private readonly eventPublisher: EventPublisher;

  constructor(private readonly options: IngestionEngineOptions) {
    this.eventPublisher = options.eventPublisher ?? noopEventPublisher;
  }

  async run(options: IngestionRunOptions = {}): Promise<IngestionRunSummary> {
    const connectors = options.connectorIds?.length
      ? options.connectorIds.map((id) => this.options.registry.require(id))
      : this.options.registry.list({ enabledOnly: true });

    const summary: IngestionRunSummary = {
      connectorIds: connectors.map((connector) => connector.descriptor.id),
      discovered: 0,
      payloads: 0,
      productsCreated: 0,
      productsUpdated: 0,
      manufacturersCreated: 0,
      manufacturersUpdated: 0,
      formulationsChanged: 0,
      availabilityChanged: 0,
      discontinued: 0,
      issues: []
    };

    for (const connector of connectors) {
      const items = await connector.discover(options.discovery ?? {});
      summary.discovered += items.length;
      for (const item of items) {
        const payloads = await connector.fetch(item);
        summary.payloads += payloads.length;
        for (const payload of payloads) {
          const normalized = await connector.normalise(payload);
          summary.issues.push(...normalized.issues);

          for (const manufacturer of normalized.manufacturers) {
            if (options.dryRun) continue;
            const action = await this.options.repository.upsertManufacturer(manufacturer);
            if (action === "created") summary.manufacturersCreated += 1;
            else summary.manufacturersUpdated += 1;
          }

          for (const product of normalized.products) {
            const existing = await this.options.repository.getProduct(product.id);
            const changedNutrients = existing ? detectChangedNutrients(existing, product) : [];
            const availabilityChanged = existing ? JSON.stringify(existing.availability) !== JSON.stringify(product.availability) : false;
            if (changedNutrients.length) summary.formulationsChanged += 1;
            if (availabilityChanged) summary.availabilityChanged += 1;
            if (product.discontinued || product.availability.discontinued) summary.discontinued += 1;

            if (!options.dryRun) {
              const action = await this.options.repository.upsertProduct(product);
              if (action === "created") summary.productsCreated += 1;
              else summary.productsUpdated += 1;
              await this.publishProductEvents(product, changedNutrients, availabilityChanged);
            }
          }
        }
      }
    }

    return summary;
  }

  async discover(context: DiscoveryContext = {}, connectorIds?: string[]) {
    const connectors = connectorIds?.length
      ? connectorIds.map((id) => this.options.registry.require(id))
      : this.options.registry.list({ enabledOnly: true });
    const results = [];
    for (const connector of connectors) {
      results.push(...(await connector.discover(context)));
    }
    return results;
  }

  private async publishProductEvents(product: FeedProduct, changedNutrients: string[], availabilityChanged: boolean): Promise<void> {
    const occurredAt = new Date().toISOString();
    await this.eventPublisher.publish({ type: "nutrition.product.updated", occurredAt, product });
    if (product.discontinued || product.availability.discontinued) {
      await this.eventPublisher.publish({ type: "nutrition.product.discontinued", occurredAt, product });
    }
    if (changedNutrients.length) {
      await this.eventPublisher.publish({ type: "nutrition.formulation.changed", occurredAt, product, changedNutrients });
    }
    if (availabilityChanged) {
      await this.eventPublisher.publish({ type: "nutrition.country_availability.changed", occurredAt, product });
    }
  }
}

function detectChangedNutrients(existing: FeedProduct, incoming: FeedProduct): string[] {
  const changed = new Set<string>();
  const keys = new Set([...Object.keys(existing.nutrients), ...Object.keys(incoming.nutrients)]);
  for (const key of keys) {
    if (existing.nutrients[key]?.value !== incoming.nutrients[key]?.value || existing.nutrients[key]?.unit !== incoming.nutrients[key]?.unit) {
      changed.add(key);
    }
  }
  return Array.from(changed);
}

export function issue(code: string, message: string, severity: DataQualityIssue["severity"] = "warning"): DataQualityIssue {
  return { code, message, severity };
}
