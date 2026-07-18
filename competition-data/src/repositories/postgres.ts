import { Pool, type PoolClient, type PoolConfig } from "pg";
import { createHash } from "crypto";
import type {
  CandidateSearch,
  CompetitionDataRepository,
  ReconciliationApplyResult
} from "../adapters/repository";
import type {
  Competition,
  CompetitionEvent,
  CompetitionResult,
  EntityCandidate,
  EntryListItem,
  Horse,
  RankingRecord,
  ReconciliationPlan,
  Rider
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
import { normaliseSearchText } from "../domain/normaliseText";

type EntityType = "competition" | "event" | "horse" | "rider" | "result" | "entry" | "ranking";

export interface PostgresRepositoryOptions {
  pool?: Pool;
  connectionString?: string;
  poolConfig?: PoolConfig;
}

export function createPostgresRepositories(options: PostgresRepositoryOptions): PostgresCompetitionDataRepository {
  return new PostgresCompetitionDataRepository(options);
}

export class PostgresCompetitionDataRepository implements CompetitionDataRepository {
  readonly pool: Pool;

  constructor(options: PostgresRepositoryOptions) {
    this.pool = options.pool ?? new Pool({ connectionString: options.connectionString, ...options.poolConfig });
    this.pool.on("error", (error: unknown) => {
      const code = (error as { code?: string }).code;
      if (code === "57P01") return;
      process.emitWarning(error instanceof Error ? error : new Error(String(error)));
    });
  }

  async healthCheck(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findCompetitionCandidates(search: CandidateSearch<Competition>): Promise<Array<EntityCandidate<Competition>>> {
    return this.findCandidates("competition", search);
  }

  async findEventCandidates(search: CandidateSearch<CompetitionEvent>): Promise<Array<EntityCandidate<CompetitionEvent>>> {
    return this.findCandidates("event", search);
  }

  async findHorseCandidates(search: CandidateSearch<Horse>): Promise<Array<EntityCandidate<Horse>>> {
    return this.findCandidates("horse", search);
  }

  async findRiderCandidates(search: CandidateSearch<Rider>): Promise<Array<EntityCandidate<Rider>>> {
    return this.findCandidates("rider", search);
  }

  async findResultCandidates(search: CandidateSearch<CompetitionResult>): Promise<Array<EntityCandidate<CompetitionResult>>> {
    return this.findCandidates("result", search);
  }

  async findEntryCandidates(search: CandidateSearch<EntryListItem>): Promise<Array<EntityCandidate<EntryListItem>>> {
    return this.findCandidates("entry", search);
  }

  async findRankingCandidates(search: CandidateSearch<RankingRecord>): Promise<Array<EntityCandidate<RankingRecord>>> {
    return this.findCandidates("ranking", search);
  }

  async applyReconciliationPlan(plan: ReconciliationPlan): Promise<ReconciliationApplyResult> {
    return this.transaction(async (client) => {
      const result: ReconciliationApplyResult = { created: 0, updated: 0, review: 0, ignored: 0 };
      await this.applyOne(client, "competition", plan.competition, result);
      for (const resolution of plan.events) await this.applyOne(client, "event", resolution, result);
      for (const resolution of plan.horses) await this.applyOne(client, "horse", resolution, result);
      for (const resolution of plan.riders) await this.applyOne(client, "rider", resolution, result);
      for (const resolution of plan.results) await this.applyOne(client, "result", resolution, result);
      for (const resolution of plan.entries) await this.applyOne(client, "entry", resolution, result);
      for (const resolution of plan.rankings) await this.applyOne(client, "ranking", resolution, result);
      return result;
    });
  }

  async saveImportRun(run: ImportRun): Promise<void> {
    await this.upsertJson("competition_data_import_runs", run.id, run);
  }

  async updateImportRun(run: ImportRun): Promise<void> {
    await this.saveImportRun(run);
  }

  async listImportRuns(): Promise<ImportRun[]> {
    return this.listJson<ImportRun>("competition_data_import_runs");
  }

  async getImportRun(id: string): Promise<ImportRun | undefined> {
    return this.getJson<ImportRun>("competition_data_import_runs", id);
  }

  async saveStagedRecord(record: StagedRecord): Promise<void> {
    await this.upsertJson("competition_data_staged_records", record.id, record);
  }

  async updateStagedRecord(record: StagedRecord): Promise<void> {
    await this.saveStagedRecord(record);
  }

  async listStagedRecords(filter: { importRunId?: string; processingState?: string; matchState?: string } = {}): Promise<StagedRecord[]> {
    const records = await this.listJson<StagedRecord>("competition_data_staged_records");
    return records.filter((record) => {
      if (filter.importRunId && record.importRunId !== filter.importRunId) return false;
      if (filter.processingState && record.processingState !== filter.processingState) return false;
      if (filter.matchState && record.matchState !== filter.matchState) return false;
      return true;
    });
  }

  async getStagedRecord(id: string): Promise<StagedRecord | undefined> {
    return this.getJson<StagedRecord>("competition_data_staged_records", id);
  }

  async saveConflict(conflict: ConflictRecord): Promise<void> {
    await this.upsertJson("competition_data_conflicts", conflict.id ?? randomId("conflict"), conflict);
  }

  async updateConflict(conflict: ConflictRecord): Promise<void> {
    await this.saveConflict(conflict);
  }

  async listConflicts(filter: { status?: string } = {}): Promise<ConflictRecord[]> {
    const records = await this.listJson<ConflictRecord>("competition_data_conflicts");
    return records.filter((record) => !filter.status || record.status === filter.status);
  }

  async getConflict(id: string): Promise<ConflictRecord | undefined> {
    return this.getJson<ConflictRecord>("competition_data_conflicts", id);
  }

  async saveResolutionCandidate(candidate: ResolutionCandidate): Promise<void> {
    await this.upsertJson("competition_data_resolution_candidates", candidate.id ?? randomId("resolution"), candidate);
  }

  async updateResolutionCandidate(candidate: ResolutionCandidate): Promise<void> {
    await this.saveResolutionCandidate(candidate);
  }

  async listResolutionCandidates(filter: { status?: string } = {}): Promise<ResolutionCandidate[]> {
    const records = await this.listJson<ResolutionCandidate>("competition_data_resolution_candidates");
    return records.filter((record) => !filter.status || record.status === filter.status);
  }

  async getResolutionCandidate(id: string): Promise<ResolutionCandidate | undefined> {
    return this.getJson<ResolutionCandidate>("competition_data_resolution_candidates", id);
  }

  async saveResultVersion(version: ResultVersion): Promise<void> {
    await this.upsertJson("competition_data_result_versions", version.id ?? randomId("version"), version);
  }

  async listResultVersions(resultId: string): Promise<ResultVersion[]> {
    const records = await this.listJson<ResultVersion>("competition_data_result_versions");
    return records.filter((record) => record.canonicalResultId === resultId);
  }

  async saveConnectorHealth(health: ConnectorHealth): Promise<void> {
    await this.upsertJson("competition_data_connector_health", health.connectorId, health);
  }

  async getConnectorHealth(connectorId: string): Promise<ConnectorHealth | undefined> {
    return this.getJson<ConnectorHealth>("competition_data_connector_health", connectorId);
  }

  async acquireSchedulerLock(lock: SchedulerLock): Promise<boolean> {
    const result = await this.pool.query(
      `INSERT INTO competition_data_scheduler_locks (id, scope, payload, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (scope) DO UPDATE
       SET id = EXCLUDED.id, payload = EXCLUDED.payload, expires_at = EXCLUDED.expires_at
       WHERE competition_data_scheduler_locks.expires_at < NOW()
       RETURNING id`,
      [lock.id, lock.scope, lock, lock.expiresAt]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async releaseSchedulerLock(lockId: string): Promise<void> {
    await this.pool.query("DELETE FROM competition_data_scheduler_locks WHERE id = $1", [lockId]);
  }

  async appendEvent(event: CompetitionDataEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO competition_data_event_outbox (id, payload, status, retry_count, next_attempt_at, error_history, idempotency_key, schema_version)
       VALUES ($1, $2, 'pending', 0, NOW(), '[]'::jsonb, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [event.id, JSON.stringify(event), `${event.type}:${event.id}`, event.version]
    );
  }

  async listEvents(): Promise<CompetitionDataEvent[]> {
    return this.listJson<CompetitionDataEvent>("competition_data_event_outbox");
  }

  async listOutboxEvents(status?: string): Promise<Array<{ id: string; payload: CompetitionDataEvent; status: string; retryCount: number }>> {
    const result = await this.pool.query(
      `SELECT id, payload, status, retry_count FROM competition_data_event_outbox
       WHERE ($1::text IS NULL OR status = $1)
       ORDER BY created_at ASC`,
      [status ?? null]
    );
    return result.rows.map((row) => ({ id: row.id, payload: row.payload, status: row.status, retryCount: row.retry_count }));
  }

  async markOutboxDelivered(id: string): Promise<void> {
    await this.pool.query("UPDATE competition_data_event_outbox SET status = 'delivered', delivered_at = NOW(), updated_at = NOW() WHERE id = $1", [id]);
  }

  async markOutboxFailed(id: string, error: string, deadLetter = false): Promise<void> {
    await this.pool.query(
      `UPDATE competition_data_event_outbox
       SET status = $2,
           retry_count = retry_count + 1,
           next_attempt_at = NOW() + INTERVAL '1 minute',
           error_history = error_history || $3::jsonb,
           dead_lettered_at = CASE WHEN $2 = 'dead_letter' THEN NOW() ELSE dead_lettered_at END,
           updated_at = NOW()
       WHERE id = $1`,
      [id, deadLetter ? "dead_letter" : "pending", JSON.stringify([{ at: new Date().toISOString(), error }])]
    );
  }

  async saveConfiguration(id: string, payload: unknown): Promise<void> {
    await this.upsertJson("competition_data_configuration", id, payload);
  }

  async getConfiguration<T = unknown>(id: string): Promise<T | undefined> {
    return this.getJson<T>("competition_data_configuration", id);
  }

  async listConfigurations<T = unknown>(): Promise<Array<{ id: string; payload: T }>> {
    const result = await this.pool.query("SELECT id, payload FROM competition_data_configuration ORDER BY id");
    return result.rows.map((row) => ({ id: row.id, payload: row.payload as T }));
  }

  async saveMappingProfile(id: string, payload: unknown, enabled = false): Promise<void> {
    await this.pool.query(
      `INSERT INTO competition_data_mapping_profiles (id, version, enabled, payload)
       VALUES ($1, 1, $2, $3)
       ON CONFLICT (id) DO UPDATE
       SET version = competition_data_mapping_profiles.version + 1,
           enabled = EXCLUDED.enabled,
           payload = EXCLUDED.payload,
           updated_at = NOW()`,
      [id, enabled, JSON.stringify(payload)]
    );
  }

  async getMappingProfile<T = unknown>(id: string): Promise<T | undefined> {
    const result = await this.pool.query("SELECT payload FROM competition_data_mapping_profiles WHERE id = $1", [id]);
    return result.rows[0]?.payload as T | undefined;
  }

  async listMappingProfiles<T = unknown>(): Promise<Array<{ id: string; payload: T; enabled: boolean; version: number }>> {
    const result = await this.pool.query("SELECT id, payload, enabled, version FROM competition_data_mapping_profiles ORDER BY id");
    return result.rows.map((row) => ({ id: row.id, payload: row.payload as T, enabled: row.enabled, version: row.version }));
  }

  async saveRollbackAudit(id: string, importRunId: string, plan: unknown, status: string, confirmation?: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO competition_data_rollback_audit (id, import_run_id, plan, status, confirmation, applied_at)
       VALUES ($1, $2, $3, $4, $5, CASE WHEN $4 = 'applied' THEN NOW() ELSE NULL END)
       ON CONFLICT (id) DO UPDATE SET plan = EXCLUDED.plan, status = EXCLUDED.status, confirmation = EXCLUDED.confirmation, applied_at = EXCLUDED.applied_at`,
      [id, importRunId, JSON.stringify(plan), status, confirmation]
    );
  }

  async listTableNames(): Promise<string[]> {
    const result = await this.pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'competition_data_%' ORDER BY table_name"
    );
    return result.rows.map((row) => row.table_name);
  }

  async listIndexNames(): Promise<string[]> {
    const result = await this.pool.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_competition_data_%' ORDER BY indexname");
    return result.rows.map((row) => row.indexname);
  }

  async saveSourceEventCheckpoint(checkpoint: SourceEventCheckpoint): Promise<void> {
    await this.upsertJson("competition_data_source_event_checkpoints", checkpoint.id, checkpoint);
  }

  async listSourceEventCheckpoints(filter: { source?: string; state?: string } = {}): Promise<SourceEventCheckpoint[]> {
    const records = await this.listJson<SourceEventCheckpoint>("competition_data_source_event_checkpoints");
    return records.filter((record) => {
      if (filter.source && record.source !== filter.source) return false;
      if (filter.state && record.currentState !== filter.state) return false;
      return true;
    });
  }

  async getSourceEventCheckpoint(id: string): Promise<SourceEventCheckpoint | undefined> {
    return this.getJson<SourceEventCheckpoint>("competition_data_source_event_checkpoints", id);
  }

  async saveSourceHealthSummary(summary: SourceHealthSummary): Promise<void> {
    await this.upsertJson("competition_data_source_health", summary.source, summary);
  }

  async getSourceHealthSummary(source: string): Promise<SourceHealthSummary | undefined> {
    return this.getJson<SourceHealthSummary>("competition_data_source_health", source);
  }

  async saveBackfillPlan(plan: BackfillPlan): Promise<void> {
    await this.upsertJson("competition_data_backfill_plans", plan.id, plan);
  }

  async getBackfillPlan(id: string): Promise<BackfillPlan | undefined> {
    return this.getJson<BackfillPlan>("competition_data_backfill_plans", id);
  }

  async listBackfillPlans(source?: string): Promise<BackfillPlan[]> {
    const plans = await this.listJson<BackfillPlan>("competition_data_backfill_plans");
    return plans.filter((plan) => !source || plan.source === source);
  }

  async listCanonicalRecords(entityType?: string): Promise<unknown[]> {
    const result = await this.pool.query(
      `SELECT payload FROM competition_data_canonical_records
       WHERE ($1::text IS NULL OR entity_type = $1)
       ORDER BY created_at ASC
       LIMIT 500`,
      [entityType ?? null]
    );
    return result.rows.map((row) => row.payload);
  }

  private async findCandidates<TEntity>(entityType: EntityType, search: CandidateSearch<TEntity>): Promise<Array<EntityCandidate<TEntity>>> {
    const result = await this.pool.query(
      `SELECT payload, external_ids
       FROM competition_data_canonical_records
       WHERE entity_type = $1
       AND (
         external_ids @> $2::jsonb
         OR search_name = $3
       )
       LIMIT 25`,
      [entityType, JSON.stringify(search.externalIds ?? []), normaliseSearchText(search.name)]
    );
    return result.rows.map((row) => ({ entity: row.payload as TEntity, externalIds: row.external_ids }));
  }

  private async applyOne<TEntity>(
    client: PoolClient,
    entityType: EntityType,
    resolution: { action: string; incoming: TEntity; match?: TEntity },
    result: ReconciliationApplyResult
  ): Promise<void> {
    if (resolution.action === "review") {
      result.review += 1;
      return;
    }
    if (resolution.action === "ignore") {
      result.ignored += 1;
      return;
    }

    const entity = resolution.action === "update" && resolution.match ? mergeEntity(resolution.match, resolution.incoming) : resolution.incoming;
    const id = readId(entity) ?? randomId(entityType);
    await client.query(
      `INSERT INTO competition_data_canonical_records (id, entity_type, external_ids, search_name, country_code, date_value, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE
       SET external_ids = EXCLUDED.external_ids,
           search_name = EXCLUDED.search_name,
           country_code = EXCLUDED.country_code,
           date_value = EXCLUDED.date_value,
           payload = EXCLUDED.payload,
           updated_at = NOW()`,
      [
        id,
        entityType,
        JSON.stringify(readExternalIds(entity)),
        normaliseSearchText(readName(entity)),
        readString(entity, "countryCode"),
        readString(entity, "startDate") ?? readString(entity, "resultDate") ?? readString(entity, "rankingDate"),
        JSON.stringify({ ...(entity as object), id })
      ]
    );
    if (entityType === "result") {
      const fingerprint = createHash("sha256").update(JSON.stringify(resultVersionStableFields(entity))).digest("hex");
      await client.query(
        `INSERT INTO competition_data_result_versions (id, payload)
         VALUES ($1, $2)
         ON CONFLICT (id) DO NOTHING`,
        [
          `version:${id}:${fingerprint}`,
          JSON.stringify({
            id: `version:${id}:${fingerprint}`,
            canonicalResultId: id,
            sourceReference: {
              source: { id: "british-eventing", name: "British Eventing", kind: "national_federation", mode: "public_page", official: true },
              sourceUrl: readFirstSourceUrl(entity),
              importedAt: new Date().toISOString()
            },
            resultFingerprint: fingerprint,
            publicationStatus: "unknown",
            verificationState: "source_verified",
            result: entity,
            fieldProvenance: [],
            createdAt: new Date().toISOString()
          })
        ]
      );
    }
    if (resolution.action === "update") result.updated += 1;
    else result.created += 1;
  }

  private async upsertJson(table: string, id: string, payload: unknown): Promise<void> {
    await this.pool.query(
      `INSERT INTO ${table} (id, payload)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [id, JSON.stringify(payload)]
    );
  }

  private async getJson<TEntity>(table: string, id: string): Promise<TEntity | undefined> {
    const result = await this.pool.query(`SELECT payload FROM ${table} WHERE id = $1`, [id]);
    return result.rows[0]?.payload as TEntity | undefined;
  }

  private async listJson<TEntity>(table: string): Promise<TEntity[]> {
    const result = await this.pool.query(`SELECT payload FROM ${table} ORDER BY created_at DESC LIMIT 500`);
    return result.rows.map((row) => row.payload as TEntity);
  }
}

function readId(entity: unknown): string | undefined {
  return readString(entity, "id");
}

function readName(entity: unknown): string | undefined {
  return readString(entity, "name") ?? readString(entity, "displayName") ?? [readString(entity, "riderName"), readString(entity, "horseName")].filter(Boolean).join(" ");
}

function readExternalIds(entity: unknown): unknown[] {
  const externalIds = (entity as { externalIds?: unknown }).externalIds;
  return Array.isArray(externalIds) ? externalIds : [];
}

function readString(entity: unknown, key: string): string | undefined {
  const value = (entity as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function randomId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readFirstSourceUrl(entity: unknown): string | undefined {
  const first = readExternalIds(entity)[0] as { sourceUrl?: unknown } | undefined;
  return typeof first?.sourceUrl === "string" ? first.sourceUrl : undefined;
}

function resultVersionStableFields(entity: unknown): unknown {
  const record = entity as Record<string, unknown>;
  const metadata = record.metadata as Record<string, unknown> | undefined;
  return {
    externalIds: readExternalIds(entity),
    horseName: record.horseName,
    riderName: record.riderName,
    placing: record.placing,
    score: record.score,
    faults: record.faults,
    time: record.time,
    status: record.status,
    startNumber: record.startNumber,
    resultDate: record.resultDate,
    eventing: metadata?.eventing,
    originalStatus: metadata?.originalStatus,
    canonicalStatus: metadata?.canonicalStatus
  };
}

function mergeEntity<TEntity>(match: TEntity, incoming: TEntity): TEntity {
  const matchRecord = match as Record<string, unknown>;
  const incomingRecord = incoming as Record<string, unknown>;
  return {
    ...matchRecord,
    ...incomingRecord,
    metadata: mergeMetadata(matchRecord.metadata, incomingRecord.metadata)
  } as TEntity;
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
    if (existingRecord[key] !== undefined) merged[key] = existingRecord[key];
  }
  return merged;
}
