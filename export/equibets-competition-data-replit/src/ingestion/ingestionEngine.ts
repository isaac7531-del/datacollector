import type { CompetitionDataRepository } from "../adapters/repository";
import type { Logger } from "../adapters/logger";
import { noopLogger } from "../adapters/logger";
import type { ConnectorRegistry } from "../connectors/registry";
import type { CollectionContext, DiscoveryContext } from "../connectors/types";
import type { DataQualityIssue, DiscoveryItem, IngestionRunSummary, NormalizedCompetitionGraph, RawCompetitionPayload } from "../domain/types";
import type { ImportRun } from "../domain/records";
import type { EventPublisher } from "../events/events";
import { createCompetitionDataEvent } from "../events/events";
import { DiscoveryService } from "../discovery/discovery-service";
import type { NormalizerRegistry } from "../normalisation/normalizer";
import { attachPayloadProvenance } from "../provenance/provenance";
import { Reconciler } from "../reconciliation/reconciler";
import { StagingService } from "../storage/staging";
import { validateCompetitionGraph } from "../validation/validateGraph";

export interface IngestionRunOptions {
  connectorIds?: string[];
  discovery?: DiscoveryContext;
  importBatchId?: string;
  dryRun?: boolean;
  signal?: AbortSignal;
  triggerType?: ImportRun["triggerType"];
  initiatedByUserId?: string;
  correlationId?: string;
}

export interface IngestionEngineOptions {
  registry: ConnectorRegistry;
  normalizers: NormalizerRegistry;
  repository: CompetitionDataRepository;
  logger?: Logger;
  importBatchPrefix?: string;
  eventPublisher?: EventPublisher;
}

export class IngestionEngine {
  private readonly discovery: DiscoveryService;
  private readonly reconciler: Reconciler;
  private readonly logger: Logger;
  private readonly staging: StagingService;

  constructor(private readonly options: IngestionEngineOptions) {
    this.logger = options.logger ?? noopLogger;
    this.discovery = new DiscoveryService({ registry: options.registry, logger: this.logger });
    this.reconciler = new Reconciler({ repository: options.repository });
    this.staging = new StagingService(options.repository);
  }

  async discover(context: DiscoveryContext = {}, connectorIds?: string[]): Promise<DiscoveryItem[]> {
    return this.discovery.discover(context, connectorIds);
  }

  async run(options: IngestionRunOptions = {}): Promise<IngestionRunSummary> {
    const importBatchId = options.importBatchId ?? this.createImportBatchId();
    const correlationId = options.correlationId ?? importBatchId;
    const importRun = createImportRun(importBatchId, options);
    await this.options.repository.saveImportRun?.(importRun);
    await this.publish("competitionData.import.started", { importRunId: importBatchId, connectorIds: importRun.connectorIds }, correlationId);
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

    try {
      const discoveryItems = await this.discover(options.discovery, options.connectorIds);
      summary.discovered = discoveryItems.length;

      for (const item of discoveryItems) {
        try {
          const payloads = await this.collect(item, {
            importBatchId,
            signal: options.signal
          });
          summary.payloads += payloads.length;

          for (const payload of payloads) {
            await this.staging.stagePayload(payload, {
              importRunId: importBatchId,
              sourceOrganisation: payload.source.name,
              sourceFormat: inferSourceFormat(payload),
              publicationStatus: "unknown"
            });
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

              await this.emitPlanEvents(plan, correlationId);
            }
          }
        } catch (error) {
          const issue = ingestionIssue(item.connectorId, error);
          summary.issues.push(issue);
          this.logger.error("Competition ingestion item failed", {
            connectorId: item.connectorId,
            itemId: item.id,
            error: issue.message
          });
        }
      }

      await this.finishImportRun(importRun, summary.issues.some((issue) => issue.severity === "error") ? "partially_completed" : "completed", summary);
      await this.publish("competitionData.import.completed", { importRunId: importBatchId, summary }, correlationId);
      this.logger.info("Competition ingestion run completed", {
        importBatchId,
        ...summary
      });

      return summary;
    } catch (error) {
      const issue = ingestionIssue("engine", error);
      summary.issues.push(issue);
      await this.finishImportRun(importRun, "failed", summary);
      await this.publish("competitionData.import.failed", { importRunId: importBatchId, issue }, correlationId);
      throw error;
    }
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

  private async finishImportRun(importRun: ImportRun, status: ImportRun["status"], summary: IngestionRunSummary): Promise<void> {
    await this.options.repository.updateImportRun?.({
      ...importRun,
      status,
      finishedAt: new Date().toISOString(),
      recordsDiscovered: summary.discovered,
      recordsFetched: summary.payloads,
      recordsStaged: summary.payloads,
      recordsValidated: summary.graphs,
      recordsAccepted: summary.created,
      recordsUpdated: summary.updated,
      recordsUnresolved: summary.review,
      recordsRejected: summary.ignored,
      conflicts: summary.issues.filter((issue) => issue.code.includes("conflict")).length,
      errors: summary.issues
    });
  }

  private async publish(type: Parameters<typeof createCompetitionDataEvent>[0], payload: unknown, correlationId: string): Promise<void> {
    const event = createCompetitionDataEvent(type, payload, correlationId);
    await this.options.eventPublisher?.publish(event);
    await this.options.repository.appendEvent?.(event);
  }

  private async emitPlanEvents(plan: Awaited<ReturnType<Reconciler["buildPlan"]>>, correlationId: string): Promise<void> {
    for (const resolution of plan.horses) {
      if (resolution.action === "create") await this.publish("competitionData.horse.created", resolution.incoming, correlationId);
      if (resolution.action === "update") await this.publish("competitionData.horse.matched", { incoming: resolution.incoming, match: resolution.match }, correlationId);
    }
    for (const resolution of plan.riders) {
      if (resolution.action === "create") await this.publish("competitionData.rider.created", resolution.incoming, correlationId);
      if (resolution.action === "update") await this.publish("competitionData.rider.matched", { incoming: resolution.incoming, match: resolution.match }, correlationId);
    }
    for (const resolution of plan.results) {
      if (resolution.action === "create") await this.publish("competitionData.result.created", resolution.incoming, correlationId);
      if (resolution.action === "update") await this.publish("competitionData.result.updated", { incoming: resolution.incoming, match: resolution.match }, correlationId);
      if (resolution.action === "review") await this.publish("competitionData.resolution.required", resolution, correlationId);
    }
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

function createImportRun(importBatchId: string, options: IngestionRunOptions): ImportRun {
  const now = new Date().toISOString();
  return {
    id: importBatchId,
    connectorIds: options.connectorIds ?? [],
    triggerType: options.triggerType ?? "manual",
    initiatedByUserId: options.initiatedByUserId,
    status: "running",
    startedAt: now,
    recordsDiscovered: 0,
    recordsFetched: 0,
    recordsStaged: 0,
    recordsValidated: 0,
    recordsAccepted: 0,
    recordsUpdated: 0,
    recordsUnresolved: 0,
    recordsRejected: 0,
    conflicts: 0,
    errors: [],
    retryCount: 0,
    sourceCheckTime: now
  };
}

function ingestionIssue(connectorId: string, error: unknown): DataQualityIssue {
  return {
    code: "ingestion.connector.failed",
    message: error instanceof Error ? error.message : "Unknown ingestion error",
    severity: "error",
    path: connectorId
  };
}

function inferSourceFormat(payload: RawCompetitionPayload): "csv" | "excel" | "json" | "xml" | "manual" | "other" {
  const contentType = payload.contentType ?? "";
  if (contentType.includes("csv")) return "csv";
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) return "excel";
  if (contentType.includes("json")) return "json";
  if (contentType.includes("xml")) return "xml";
  if (payload.connectorId.includes("manual")) return "manual";
  return "other";
}
