import type { CompetitionDataRepository } from "../adapters/repository";
import { InMemoryCompetitionDataRepository } from "../adapters/repository";
import { createCsvResultsConnector } from "../connectors/csvResultsConnector";
import { createPublicFileUrlConnector } from "../connectors/publicFileUrlConnector";
import type { CompetitionDataConnector } from "../connectors/types";
import type { DataSource, ManualEntrySubmission } from "../domain/types";
import type { TableColumnMapping } from "../normalisation/sourceNeutral";
import { Reconciler } from "../reconciliation/reconciler";
import { CompetitionDataEngine, type CompetitionDataEngineOptions } from "../service/CompetitionDataEngine";

export function createCompetitionDataEngine(options: Partial<CompetitionDataEngineOptions> = {}): CompetitionDataEngine {
  return new CompetitionDataEngine({
    repository: options.repository ?? new InMemoryCompetitionDataRepository(),
    connectors: options.connectors ?? [],
    normalizers: options.normalizers,
    logger: options.logger,
    importBatchPrefix: options.importBatchPrefix,
    eventPublisher: options.eventPublisher
  });
}

export function connectorRegistry(engine: CompetitionDataEngine) {
  return engine.connectors;
}

export async function runConnector(engine: CompetitionDataEngine, connectorId: string) {
  return engine.runConnector(connectorId);
}

export async function runBackfill(engine: CompetitionDataEngine, connectorId: string, from: string, to: string) {
  return engine.runBackfill(connectorId, from, to);
}

export async function importFile(options: {
  repository?: CompetitionDataRepository;
  source: DataSource;
  connectorId?: string;
  csvText: string;
  mapping: TableColumnMapping;
}) {
  const connector = createCsvResultsConnector({
    id: options.connectorId ?? "generic-csv",
    enabled: true,
    source: options.source,
    csvText: options.csvText,
    mapping: options.mapping
  });
  const engine = createCompetitionDataEngine({ repository: options.repository, connectors: [connector] });
  return engine.runConnector(connector.descriptor.id);
}

export async function importPublicUrl(options: {
  repository?: CompetitionDataRepository;
  source: DataSource;
  connectorId?: string;
  url: string;
  mapping?: TableColumnMapping;
}) {
  const connector = createPublicFileUrlConnector({
    id: options.connectorId ?? "public-file-url",
    enabled: true,
    source: options.source,
    urls: [options.url],
    mapping: options.mapping
  });
  const engine = createCompetitionDataEngine({ repository: options.repository, connectors: [connector] });
  return engine.runConnector(connector.descriptor.id);
}

export async function processStagedRecords(repository: CompetitionDataRepository) {
  return repository.listStagedRecords?.({ processingState: "staged" }) ?? [];
}

export async function reconcileResult(repository: CompetitionDataRepository, connector: CompetitionDataConnector) {
  const engine = createCompetitionDataEngine({ repository, connectors: [connector] });
  return engine.runConnector(connector.descriptor.id, { dryRun: true });
}

export async function submitManualResult(
  engine: CompetitionDataEngine,
  submission: ManualEntrySubmission,
  options: { dryRun?: boolean } = {}
) {
  return engine.submitManualEntry(submission, options);
}

export async function confirmResultMatch(repository: CompetitionDataRepository, resolutionCandidateId: string) {
  const candidate = await repository.getResolutionCandidate?.(resolutionCandidateId);
  if (!candidate) return undefined;
  const updated = { ...candidate, status: "confirmed" as const, resolvedAt: new Date().toISOString() };
  await repository.updateResolutionCandidate?.(updated);
  return updated;
}

export async function rejectResultMatch(repository: CompetitionDataRepository, resolutionCandidateId: string) {
  const candidate = await repository.getResolutionCandidate?.(resolutionCandidateId);
  if (!candidate) return undefined;
  const updated = { ...candidate, status: "rejected" as const, resolvedAt: new Date().toISOString() };
  await repository.updateResolutionCandidate?.(updated);
  return updated;
}

export function createReconciler(repository: CompetitionDataRepository): Reconciler {
  return new Reconciler({ repository });
}
