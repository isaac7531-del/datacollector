import type {
  Competition,
  CompetitionEvent,
  CompetitionResult,
  EntityCandidate,
  EntryListItem,
  Horse,
  RankingRecord,
  ReconciliationPlan,
  Rider,
  SourceIdentifier
} from "../domain/types";
import type {
  ConflictRecord,
  ConnectorHealth,
  ImportRun,
  ResolutionCandidate,
  ResultVersion,
  SchedulerLock,
  StagedRecord
} from "../domain/records";
import type { BackfillPlan, SourceEventCheckpoint, SourceHealthSummary } from "../domain/acquisition";
import type { CompetitionDataEvent } from "../events/events";
import { compactIdentifier, dateOnly, normaliseSearchText } from "../domain/normaliseText";

export interface CandidateSearch<TEntity> {
  externalIds?: SourceIdentifier[];
  name?: string;
  countryCode?: string;
  date?: string;
  metadata?: Record<string, unknown>;
}

export interface ReconciliationApplyResult {
  created: number;
  updated: number;
  review: number;
  ignored: number;
}

export interface CompetitionDataRepository {
  findCompetitionCandidates(search: CandidateSearch<Competition>): Promise<Array<EntityCandidate<Competition>>>;
  findEventCandidates(search: CandidateSearch<CompetitionEvent>): Promise<Array<EntityCandidate<CompetitionEvent>>>;
  findHorseCandidates(search: CandidateSearch<Horse>): Promise<Array<EntityCandidate<Horse>>>;
  findRiderCandidates(search: CandidateSearch<Rider>): Promise<Array<EntityCandidate<Rider>>>;
  findResultCandidates(search: CandidateSearch<CompetitionResult>): Promise<Array<EntityCandidate<CompetitionResult>>>;
  findEntryCandidates(search: CandidateSearch<EntryListItem>): Promise<Array<EntityCandidate<EntryListItem>>>;
  findRankingCandidates(search: CandidateSearch<RankingRecord>): Promise<Array<EntityCandidate<RankingRecord>>>;
  applyReconciliationPlan(plan: ReconciliationPlan): Promise<ReconciliationApplyResult>;
  saveImportRun?(run: ImportRun): Promise<void>;
  updateImportRun?(run: ImportRun): Promise<void>;
  listImportRuns?(): Promise<ImportRun[]>;
  getImportRun?(id: string): Promise<ImportRun | undefined>;
  saveStagedRecord?(record: StagedRecord): Promise<void>;
  updateStagedRecord?(record: StagedRecord): Promise<void>;
  listStagedRecords?(filter?: { importRunId?: string; processingState?: string; matchState?: string }): Promise<StagedRecord[]>;
  getStagedRecord?(id: string): Promise<StagedRecord | undefined>;
  saveConflict?(conflict: ConflictRecord): Promise<void>;
  updateConflict?(conflict: ConflictRecord): Promise<void>;
  listConflicts?(filter?: { status?: string }): Promise<ConflictRecord[]>;
  getConflict?(id: string): Promise<ConflictRecord | undefined>;
  saveResolutionCandidate?(candidate: ResolutionCandidate): Promise<void>;
  updateResolutionCandidate?(candidate: ResolutionCandidate): Promise<void>;
  listResolutionCandidates?(filter?: { status?: string }): Promise<ResolutionCandidate[]>;
  getResolutionCandidate?(id: string): Promise<ResolutionCandidate | undefined>;
  saveResultVersion?(version: ResultVersion): Promise<void>;
  listResultVersions?(resultId: string): Promise<ResultVersion[]>;
  saveConnectorHealth?(health: ConnectorHealth): Promise<void>;
  getConnectorHealth?(connectorId: string): Promise<ConnectorHealth | undefined>;
  acquireSchedulerLock?(lock: SchedulerLock): Promise<boolean>;
  releaseSchedulerLock?(lockId: string): Promise<void>;
  appendEvent?(event: CompetitionDataEvent): Promise<void>;
  listEvents?(): Promise<CompetitionDataEvent[]>;
  saveConfiguration?(id: string, payload: unknown): Promise<void>;
  getConfiguration?<T = unknown>(id: string): Promise<T | undefined>;
  listConfigurations?<T = unknown>(): Promise<Array<{ id: string; payload: T }>>;
  saveMappingProfile?(id: string, payload: unknown, enabled?: boolean): Promise<void>;
  getMappingProfile?<T = unknown>(id: string): Promise<T | undefined>;
  listMappingProfiles?<T = unknown>(): Promise<Array<{ id: string; payload: T; enabled: boolean; version: number }>>;
  saveRollbackAudit?(id: string, importRunId: string, plan: unknown, status: string, confirmation?: string): Promise<void>;
  saveSourceEventCheckpoint?(checkpoint: SourceEventCheckpoint): Promise<void>;
  listSourceEventCheckpoints?(filter?: { source?: string; state?: string }): Promise<SourceEventCheckpoint[]>;
  getSourceEventCheckpoint?(id: string): Promise<SourceEventCheckpoint | undefined>;
  saveSourceHealthSummary?(summary: SourceHealthSummary): Promise<void>;
  getSourceHealthSummary?(source: string): Promise<SourceHealthSummary | undefined>;
  saveBackfillPlan?(plan: BackfillPlan): Promise<void>;
  getBackfillPlan?(id: string): Promise<BackfillPlan | undefined>;
  listBackfillPlans?(source?: string): Promise<BackfillPlan[]>;
}

export class InMemoryCompetitionDataRepository implements CompetitionDataRepository {
  readonly competitions: Competition[] = [];
  readonly events: CompetitionEvent[] = [];
  readonly horses: Horse[] = [];
  readonly riders: Rider[] = [];
  readonly results: CompetitionResult[] = [];
  readonly entries: EntryListItem[] = [];
  readonly rankings: RankingRecord[] = [];
  readonly importRuns: ImportRun[] = [];
  readonly stagedRecords: StagedRecord[] = [];
  readonly conflicts: ConflictRecord[] = [];
  readonly resolutionCandidates: ResolutionCandidate[] = [];
  readonly resultVersions: ResultVersion[] = [];
  readonly connectorHealth: ConnectorHealth[] = [];
  readonly schedulerLocks: SchedulerLock[] = [];
  readonly outboxEvents: CompetitionDataEvent[] = [];
  readonly configurations = new Map<string, unknown>();
  readonly mappingProfiles = new Map<string, { payload: unknown; enabled: boolean; version: number }>();
  readonly rollbackAudits: Array<{ id: string; importRunId: string; plan: unknown; status: string; confirmation?: string }> = [];
  readonly sourceEventCheckpoints: SourceEventCheckpoint[] = [];
  readonly sourceHealthSummaries = new Map<string, SourceHealthSummary>();
  readonly backfillPlans: BackfillPlan[] = [];

  constructor(seed: Partial<Pick<InMemoryCompetitionDataRepository, "competitions" | "events" | "horses" | "riders" | "results" | "entries" | "rankings">> = {}) {
    this.competitions.push(...(seed.competitions ?? []));
    this.events.push(...(seed.events ?? []));
    this.horses.push(...(seed.horses ?? []));
    this.riders.push(...(seed.riders ?? []));
    this.results.push(...(seed.results ?? []));
    this.entries.push(...(seed.entries ?? []));
    this.rankings.push(...(seed.rankings ?? []));
  }

  async findCompetitionCandidates(search: CandidateSearch<Competition>): Promise<Array<EntityCandidate<Competition>>> {
    return findCandidates(this.competitions, search, (entity) => ({
      name: entity.name,
      countryCode: entity.countryCode,
      date: entity.startDate,
      externalIds: entity.externalIds
    }));
  }

  async findEventCandidates(search: CandidateSearch<CompetitionEvent>): Promise<Array<EntityCandidate<CompetitionEvent>>> {
    return findCandidates(this.events, search, (entity) => ({
      name: entity.name,
      date: entity.startTime,
      externalIds: entity.externalIds
    }));
  }

  async findHorseCandidates(search: CandidateSearch<Horse>): Promise<Array<EntityCandidate<Horse>>> {
    return findCandidates(this.horses, search, (entity) => ({
      name: entity.name,
      countryCode: entity.countryCode,
      externalIds: entity.externalIds
    }));
  }

  async findRiderCandidates(search: CandidateSearch<Rider>): Promise<Array<EntityCandidate<Rider>>> {
    return findCandidates(this.riders, search, (entity) => ({
      name: entity.displayName,
      countryCode: entity.countryCode,
      externalIds: entity.externalIds
    }));
  }

  async findResultCandidates(search: CandidateSearch<CompetitionResult>): Promise<Array<EntityCandidate<CompetitionResult>>> {
    return findCandidates(this.results, search, (entity) => ({
      name: [entity.riderName, entity.horseName].filter(Boolean).join(" "),
      date: entity.resultDate,
      externalIds: entity.externalIds
    }));
  }

  async findEntryCandidates(search: CandidateSearch<EntryListItem>): Promise<Array<EntityCandidate<EntryListItem>>> {
    return findCandidates(this.entries, search, (entity) => ({
      name: [entity.riderName, entity.horseName].filter(Boolean).join(" "),
      externalIds: entity.externalIds
    }));
  }

  async findRankingCandidates(search: CandidateSearch<RankingRecord>): Promise<Array<EntityCandidate<RankingRecord>>> {
    return findCandidates(this.rankings, search, (entity) => ({
      name: [entity.riderName, entity.horseName, entity.sourceRankingName].filter(Boolean).join(" "),
      date: entity.rankingDate,
      externalIds: entity.externalIds
    }));
  }

  async applyReconciliationPlan(plan: ReconciliationPlan): Promise<ReconciliationApplyResult> {
    const result: ReconciliationApplyResult = { created: 0, updated: 0, review: 0, ignored: 0 };

    applyOne(this.competitions, plan.competition, result);
    for (const resolution of plan.events) applyOne(this.events, resolution, result);
    for (const resolution of plan.horses) applyOne(this.horses, resolution, result);
    for (const resolution of plan.riders) applyOne(this.riders, resolution, result);
    for (const resolution of plan.results) applyOne(this.results, resolution, result);
    for (const resolution of plan.entries) applyOne(this.entries, resolution, result);
    for (const resolution of plan.rankings) applyOne(this.rankings, resolution, result);

    return result;
  }

  async saveImportRun(run: ImportRun): Promise<void> {
    upsertById(this.importRuns, run);
  }

  async updateImportRun(run: ImportRun): Promise<void> {
    upsertById(this.importRuns, run);
  }

  async listImportRuns(): Promise<ImportRun[]> {
    return [...this.importRuns];
  }

  async getImportRun(id: string): Promise<ImportRun | undefined> {
    return this.importRuns.find((run) => run.id === id);
  }

  async saveStagedRecord(record: StagedRecord): Promise<void> {
    upsertById(this.stagedRecords, record);
  }

  async updateStagedRecord(record: StagedRecord): Promise<void> {
    upsertById(this.stagedRecords, record);
  }

  async listStagedRecords(filter: { importRunId?: string; processingState?: string; matchState?: string } = {}): Promise<StagedRecord[]> {
    return this.stagedRecords.filter((record) => {
      if (filter.importRunId && record.importRunId !== filter.importRunId) return false;
      if (filter.processingState && record.processingState !== filter.processingState) return false;
      if (filter.matchState && record.matchState !== filter.matchState) return false;
      return true;
    });
  }

  async getStagedRecord(id: string): Promise<StagedRecord | undefined> {
    return this.stagedRecords.find((record) => record.id === id);
  }

  async saveConflict(conflict: ConflictRecord): Promise<void> {
    upsertById(this.conflicts, ensureId(conflict));
  }

  async updateConflict(conflict: ConflictRecord): Promise<void> {
    upsertById(this.conflicts, ensureId(conflict));
  }

  async listConflicts(filter: { status?: string } = {}): Promise<ConflictRecord[]> {
    return this.conflicts.filter((conflict) => !filter.status || conflict.status === filter.status);
  }

  async getConflict(id: string): Promise<ConflictRecord | undefined> {
    return this.conflicts.find((conflict) => conflict.id === id);
  }

  async saveResolutionCandidate(candidate: ResolutionCandidate): Promise<void> {
    upsertById(this.resolutionCandidates, ensureId(candidate));
  }

  async updateResolutionCandidate(candidate: ResolutionCandidate): Promise<void> {
    upsertById(this.resolutionCandidates, ensureId(candidate));
  }

  async listResolutionCandidates(filter: { status?: string } = {}): Promise<ResolutionCandidate[]> {
    return this.resolutionCandidates.filter((candidate) => !filter.status || candidate.status === filter.status);
  }

  async getResolutionCandidate(id: string): Promise<ResolutionCandidate | undefined> {
    return this.resolutionCandidates.find((candidate) => candidate.id === id);
  }

  async saveResultVersion(version: ResultVersion): Promise<void> {
    upsertById(this.resultVersions, ensureId(version));
  }

  async listResultVersions(resultId: string): Promise<ResultVersion[]> {
    return this.resultVersions.filter((version) => version.canonicalResultId === resultId);
  }

  async saveConnectorHealth(health: ConnectorHealth): Promise<void> {
    const index = this.connectorHealth.findIndex((existing) => existing.connectorId === health.connectorId);
    if (index >= 0) {
      this.connectorHealth[index] = health;
      return;
    }
    this.connectorHealth.push(health);
  }

  async getConnectorHealth(connectorId: string): Promise<ConnectorHealth | undefined> {
    return this.connectorHealth.find((health) => health.connectorId === connectorId);
  }

  async acquireSchedulerLock(lock: SchedulerLock): Promise<boolean> {
    const now = Date.now();
    const existing = this.schedulerLocks.find((candidate) => candidate.scope === lock.scope && Date.parse(candidate.expiresAt) > now);
    if (existing) {
      return false;
    }

    this.schedulerLocks.push(lock);
    return true;
  }

  async releaseSchedulerLock(lockId: string): Promise<void> {
    const index = this.schedulerLocks.findIndex((lock) => lock.id === lockId);
    if (index >= 0) {
      this.schedulerLocks.splice(index, 1);
    }
  }

  async appendEvent(event: CompetitionDataEvent): Promise<void> {
    this.outboxEvents.push(event);
  }

  async listEvents(): Promise<CompetitionDataEvent[]> {
    return [...this.outboxEvents];
  }

  async saveConfiguration(id: string, payload: unknown): Promise<void> {
    this.configurations.set(id, payload);
  }

  async getConfiguration<T = unknown>(id: string): Promise<T | undefined> {
    return this.configurations.get(id) as T | undefined;
  }

  async listConfigurations<T = unknown>(): Promise<Array<{ id: string; payload: T }>> {
    return Array.from(this.configurations.entries()).map(([id, payload]) => ({ id, payload: payload as T }));
  }

  async saveMappingProfile(id: string, payload: unknown, enabled = false): Promise<void> {
    const existing = this.mappingProfiles.get(id);
    this.mappingProfiles.set(id, { payload, enabled, version: existing ? existing.version + 1 : 1 });
  }

  async getMappingProfile<T = unknown>(id: string): Promise<T | undefined> {
    return this.mappingProfiles.get(id)?.payload as T | undefined;
  }

  async listMappingProfiles<T = unknown>(): Promise<Array<{ id: string; payload: T; enabled: boolean; version: number }>> {
    return Array.from(this.mappingProfiles.entries()).map(([id, profile]) => ({
      id,
      payload: profile.payload as T,
      enabled: profile.enabled,
      version: profile.version
    }));
  }

  async saveRollbackAudit(id: string, importRunId: string, plan: unknown, status: string, confirmation?: string): Promise<void> {
    this.rollbackAudits.push({ id, importRunId, plan, status, confirmation });
  }

  async saveSourceEventCheckpoint(checkpoint: SourceEventCheckpoint): Promise<void> {
    upsertById(this.sourceEventCheckpoints, checkpoint);
  }

  async listSourceEventCheckpoints(filter: { source?: string; state?: string } = {}): Promise<SourceEventCheckpoint[]> {
    return this.sourceEventCheckpoints.filter((checkpoint) => {
      if (filter.source && checkpoint.source !== filter.source) return false;
      if (filter.state && checkpoint.currentState !== filter.state) return false;
      return true;
    });
  }

  async getSourceEventCheckpoint(id: string): Promise<SourceEventCheckpoint | undefined> {
    return this.sourceEventCheckpoints.find((checkpoint) => checkpoint.id === id);
  }

  async saveSourceHealthSummary(summary: SourceHealthSummary): Promise<void> {
    this.sourceHealthSummaries.set(summary.source, summary);
  }

  async getSourceHealthSummary(source: string): Promise<SourceHealthSummary | undefined> {
    return this.sourceHealthSummaries.get(source);
  }

  async saveBackfillPlan(plan: BackfillPlan): Promise<void> {
    upsertById(this.backfillPlans, plan);
  }

  async getBackfillPlan(id: string): Promise<BackfillPlan | undefined> {
    return this.backfillPlans.find((plan) => plan.id === id);
  }

  async listBackfillPlans(source?: string): Promise<BackfillPlan[]> {
    return this.backfillPlans.filter((plan) => !source || plan.source === source);
  }
}

function findCandidates<TEntity>(
  entities: TEntity[],
  search: CandidateSearch<TEntity>,
  select: (entity: TEntity) => { name?: string; countryCode?: string; date?: string; externalIds?: SourceIdentifier[] }
): Array<EntityCandidate<TEntity>> {
  return entities
    .filter((entity) => {
      const candidate = select(entity);
      if (hasSharedExternalId(search.externalIds, candidate.externalIds)) {
        return true;
      }

      const searchName = normaliseSearchText(search.name);
      const candidateName = normaliseSearchText(candidate.name);
      if (!searchName || !candidateName || searchName !== candidateName) {
        return false;
      }

      if (search.countryCode && candidate.countryCode && search.countryCode !== candidate.countryCode) {
        return false;
      }

      if (search.date && candidate.date && dateOnly(search.date) !== dateOnly(candidate.date)) {
        return false;
      }

      return true;
    })
    .map((entity) => ({ entity, externalIds: select(entity).externalIds }));
}

function hasSharedExternalId(left: SourceIdentifier[] | undefined, right: SourceIdentifier[] | undefined): boolean {
  if (!left?.length || !right?.length) {
    return false;
  }

  const rightKeys = new Set(right.map(sourceIdentifierKey));
  return left.some((identifier) => rightKeys.has(sourceIdentifierKey(identifier)));
}

function sourceIdentifierKey(identifier: SourceIdentifier): string {
  return `${compactIdentifier(identifier.sourceSystem)}:${compactIdentifier(identifier.sourceId)}`;
}

function applyOne<TEntity>(
  collection: TEntity[],
  resolution: { action: string; incoming: TEntity; match?: TEntity },
  result: ReconciliationApplyResult
): void {
  if (resolution.action === "create") {
    collection.push(ensureId(resolution.incoming));
    result.created += 1;
    return;
  }

  if (resolution.action === "update" && resolution.match) {
    const matchId = readId(resolution.match);
    const index = collection.findIndex((entity) => entity === resolution.match || (!!matchId && readId(entity) === matchId));
    if (index >= 0) {
      collection[index] = mergePreservingId(resolution.match, resolution.incoming);
    }
    result.updated += 1;
    return;
  }

  if (resolution.action === "review") {
    result.review += 1;
    return;
  }

  result.ignored += 1;
}

function cryptoSafeId(): string {
  return `mem_${Math.random().toString(36).slice(2, 12)}`;
}

function readId(entity: unknown): string | undefined {
  const id = (entity as { id?: unknown }).id;
  return typeof id === "string" ? id : undefined;
}

function ensureId<TEntity>(entity: TEntity): TEntity {
  if (readId(entity)) {
    return entity;
  }

  return { ...(entity as object), id: cryptoSafeId() } as TEntity;
}

function mergePreservingId<TEntity>(match: TEntity, incoming: TEntity): TEntity {
  const matchRecord = match as Record<string, unknown>;
  const incomingRecord = incoming as Record<string, unknown>;
  return {
    ...matchRecord,
    ...incomingRecord,
    metadata: mergeMetadata(matchRecord.metadata, incomingRecord.metadata),
    id: readId(match) ?? readId(incoming)
  } as TEntity;
}

function upsertById<TEntity>(collection: TEntity[], entity: TEntity): void {
  const id = readId(entity);
  if (!id) {
    collection.push(entity);
    return;
  }

  const index = collection.findIndex((candidate) => readId(candidate) === id);
  if (index >= 0) {
    collection[index] = entity;
    return;
  }

  collection.push(entity);
}

function mergeMetadata(existing: unknown, incoming: unknown): unknown {
  const existingRecord = existing && typeof existing === "object" ? (existing as Record<string, unknown>) : {};
  const incomingRecord = incoming && typeof incoming === "object" ? (incoming as Record<string, unknown>) : {};
  const protectedKeys = [
    "privateNotes",
    "attachments",
    "healthRecords",
    "treatments",
    "privateTrainingRecords",
    "nutritionRecords",
    "privateOwnerCommunication"
  ];
  const merged: Record<string, unknown> = { ...existingRecord, ...incomingRecord };
  for (const key of protectedKeys) {
    if (existingRecord[key] !== undefined) {
      merged[key] = existingRecord[key];
    }
  }
  return merged;
}
