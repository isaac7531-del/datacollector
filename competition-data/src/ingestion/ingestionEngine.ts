import type { CompetitionDataRepository } from "../adapters/repository";
import type { Logger } from "../adapters/logger";
import { noopLogger } from "../adapters/logger";
import type { ConnectorRegistry } from "../connectors/registry";
import type { CollectionContext, DiscoveryContext } from "../connectors/types";
import type { DiscoveryItem, IngestionRunSummary, NormalizedCompetitionGraph, RawCompetitionPayload } from "../domain/types";
import { DiscoveryService } from "../discovery/discovery-service";
import type { NormalizerRegistry } from "../normalisation/normalizer";
import { attachPayloadProvenance } from "../provenance/provenance";
import { Reconciler } from "../reconciliation/reconciler";
import { validateCompetitionGraph } from "../validation/validateGraph";

export interface IngestionRunOptions {
  connectorIds?: string[];
  discovery?: DiscoveryContext;
  importBatchId?: string;
  dryRun?: boolean;
  signal?: AbortSignal;
}

export interface IngestionEngineOptions {
  registry: ConnectorRegistry;
  normalizers: NormalizerRegistry;
  repository: CompetitionDataRepository;
  logger?: Logger;
  importBatchPrefix?: string;
}

export class IngestionEngine {
  private readonly discovery: DiscoveryService;
  private readonly reconciler: Reconciler;
  private readonly logger: Logger;

  constructor(private readonly options: IngestionEngineOptions) {
    this.logger = options.logger ?? noopLogger;
    this.discovery = new DiscoveryService({ registry: options.registry, logger: this.logger });
    this.reconciler = new Reconciler({ repository: options.repository });
  }

  async discover(context: DiscoveryContext = {}, connectorIds?: string[]): Promise<DiscoveryItem[]> {
    return this.discovery.discover(context, connectorIds);
  }

  async run(options: IngestionRunOptions = {}): Promise<IngestionRunSummary> {
    const importBatchId = options.importBatchId ?? this.createImportBatchId();
    const summary: IngestionRunSummary = {
      connectorIds: options.connectorIds ?? this.options.registry.list({ enabledOnly: true }).map((connector) => connector.descriptor.id),
      discovered: 0,
      payloads: 0,
      graphs: 0,
      plans: 0,
      created: 0,
      updated: 0,
      review: 0,
      ignored: 0,
      issues: []
    };

    const discoveryItems = await this.discover(options.discovery, options.connectorIds);
    summary.discovered = discoveryItems.length;

    for (const item of discoveryItems) {
      const payloads = await this.collect(item, {
        importBatchId,
        signal: options.signal
      });
      summary.payloads += payloads.length;

      for (const payload of payloads) {
        const graphs = await this.normalize(payload, importBatchId);
        summary.graphs += graphs.length;

        for (const graph of graphs) {
          const graphIssues = validateCompetitionGraph(graph, { requirePublicSource: true });
          const graphWithIssues: NormalizedCompetitionGraph = {
            ...graph,
            issues: [...graph.issues, ...graphIssues]
          };
          summary.issues.push(...graphWithIssues.issues);

          const plan = await this.reconciler.buildPlan(graphWithIssues);
          summary.plans += 1;

          if (!options.dryRun) {
            const applyResult = await this.options.repository.applyReconciliationPlan(plan);
            summary.created += applyResult.created;
            summary.updated += applyResult.updated;
            summary.review += applyResult.review;
            summary.ignored += applyResult.ignored;
          } else {
            summary.created += countAction(plan, "create");
            summary.updated += countAction(plan, "update");
            summary.review += countAction(plan, "review");
            summary.ignored += countAction(plan, "ignore");
          }
        }
      }
    }

    this.logger.info("Competition ingestion run completed", {
      importBatchId,
      ...summary
    });

    return summary;
  }

  private async collect(item: DiscoveryItem, context: CollectionContext): Promise<RawCompetitionPayload[]> {
    const connector = this.options.registry.require(item.connectorId);
    return connector.collect(item, context);
  }

  private async normalize(payload: RawCompetitionPayload, importBatchId: string): Promise<NormalizedCompetitionGraph[]> {
    const normalizer = this.options.normalizers.requireForPayload(payload);
    const graphs = await normalizer.normalize(payload);
    return graphs.map((graph) => attachPayloadProvenance(graph, payload, importBatchId));
  }

  private createImportBatchId(): string {
    return `${this.options.importBatchPrefix ?? "competition-data"}-${new Date().toISOString()}`;
  }
}

function countAction(plan: Awaited<ReturnType<Reconciler["buildPlan"]>>, action: "create" | "update" | "review" | "ignore"): number {
  const resolutions = [
    plan.competition,
    ...plan.events,
    ...plan.horses,
    ...plan.riders,
    ...plan.results,
    ...plan.entries,
    ...plan.rankings
  ];

  return resolutions.filter((resolution) => resolution.action === action).length;
}
