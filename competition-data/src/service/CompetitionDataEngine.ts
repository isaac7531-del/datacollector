import type { CompetitionDataRepository } from "../adapters/repository";
import type { Logger } from "../adapters/logger";
import { noopLogger } from "../adapters/logger";
import type { CompetitionDataConnector, DiscoveryContext } from "../connectors/types";
import { ConnectorRegistry } from "../connectors/registry";
import type { ConnectorDescriptor } from "../connectors/types";
import type { IngestionRunSummary, ManualEntrySubmission } from "../domain/types";
import type { EventPublisher } from "../events/events";
import { IngestionEngine, type IngestionRunOptions } from "../ingestion/ingestionEngine";
import { ManualEntryService, type ManualEntryResult } from "../manual-entry/manualEntryService";
import type { CompetitionDataNormalizer } from "../normalisation/normalizer";
import { NormalizerRegistry, createPassThroughGraphNormalizer } from "../normalisation/normalizer";
import { InProcessCompetitionDataScheduler } from "../scheduling/scheduler";

export interface CompetitionDataEngineOptions {
  repository: CompetitionDataRepository;
  connectors?: CompetitionDataConnector[];
  normalizers?: CompetitionDataNormalizer[];
  logger?: Logger;
  importBatchPrefix?: string;
  eventPublisher?: EventPublisher;
}

export class CompetitionDataEngine {
  readonly connectors = new ConnectorRegistry();
  readonly normalizers = new NormalizerRegistry();

  private readonly ingestion: IngestionEngine;
  private readonly manualEntry: ManualEntryService;
  private readonly logger: Logger;

  constructor(private readonly options: CompetitionDataEngineOptions) {
    this.logger = options.logger ?? noopLogger;

    for (const connector of options.connectors ?? []) {
      this.registerConnector(connector);
    }

    const configuredNormalizers = options.normalizers?.length ? options.normalizers : [createPassThroughGraphNormalizer()];
    for (const normalizer of configuredNormalizers) {
      this.registerNormalizer(normalizer);
    }

    this.ingestion = new IngestionEngine({
      registry: this.connectors,
      normalizers: this.normalizers,
      repository: options.repository,
      logger: this.logger,
      importBatchPrefix: options.importBatchPrefix,
      eventPublisher: options.eventPublisher
    });
    this.manualEntry = new ManualEntryService(options.repository);
  }

  registerConnector(connector: CompetitionDataConnector): this {
    this.connectors.register(connector);
    return this;
  }

  registerNormalizer(normalizer: CompetitionDataNormalizer): this {
    this.normalizers.register(normalizer);
    return this;
  }

  listConnectors(options: { enabledOnly?: boolean } = {}): ConnectorDescriptor[] {
    return this.connectors.list(options).map((connector) => connector.descriptor);
  }

  getConnector(connectorId: string): ConnectorDescriptor | undefined {
    return this.connectors.get(connectorId)?.descriptor;
  }

  setConnectorStatus(connectorId: string, enabled: boolean): ConnectorDescriptor {
    const connector = this.connectors.require(connectorId);
    connector.descriptor.status = enabled ? "enabled" : "disabled";
    return connector.descriptor;
  }

  async connectorHealth(connectorId: string) {
    const connector = this.connectors.require(connectorId);
    if (connector.healthCheck) {
      return connector.healthCheck();
    }

    return {
      connectorId,
      status: connector.descriptor.status === "enabled" ? "healthy" : "disabled",
      checkedAt: new Date().toISOString(),
      consecutiveFailures: 0,
      message: "Connector does not expose a custom health check."
    };
  }

  async discover(context: DiscoveryContext = {}, connectorIds?: string[]) {
    return this.ingestion.discover(context, connectorIds);
  }

  async runIngestion(options: IngestionRunOptions = {}): Promise<IngestionRunSummary> {
    return this.ingestion.run(options);
  }

  async runConnector(connectorId: string, options: Omit<IngestionRunOptions, "connectorIds"> = {}): Promise<IngestionRunSummary> {
    return this.ingestion.run({ ...options, connectorIds: [connectorId], triggerType: options.triggerType ?? "manual" });
  }

  async runBackfill(connectorId: string, fromDate: string, toDate: string, options: Omit<IngestionRunOptions, "connectorIds" | "discovery"> = {}) {
    return this.ingestion.run({
      ...options,
      connectorIds: [connectorId],
      triggerType: "backfill",
      discovery: { fromDate, toDate }
    });
  }

  async submitManualEntry(submission: ManualEntrySubmission, options: { dryRun?: boolean } = {}): Promise<ManualEntryResult> {
    return this.manualEntry.submit(submission, options);
  }

  createInProcessScheduler(): InProcessCompetitionDataScheduler {
    return new InProcessCompetitionDataScheduler(this.ingestion);
  }
}
