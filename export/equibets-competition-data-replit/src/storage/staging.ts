import { createHash } from "crypto";
import type { CompetitionDataRepository } from "../adapters/repository";
import type { DataQualityIssue, RawCompetitionPayload } from "../domain/types";
import type { PublicationStatus, StagedRecord } from "../domain/records";

export interface StagePayloadOptions {
  importRunId: string;
  sourceOrganisation: string;
  sourceFormat: StagedRecord["sourceFormat"];
  dataType?: StagedRecord["dataType"];
  publicationStatus?: PublicationStatus;
  sourceTimestamp?: string;
  errors?: DataQualityIssue[];
}

export class StagingService {
  constructor(private readonly repository: CompetitionDataRepository) {}

  async stagePayload(payload: RawCompetitionPayload, options: StagePayloadOptions): Promise<StagedRecord> {
    const now = new Date().toISOString();
    const fingerprint = fingerprintPayload(payload.data);
    const record: StagedRecord = {
      id: `staged_${fingerprint.slice(0, 16)}`,
      connectorId: payload.connectorId,
      sourceOrganisation: options.sourceOrganisation,
      sourceRecordId: payload.rawRecordId,
      sourceUrl: payload.sourceUrl,
      sourcePublicIdentifier: payload.rawRecordId,
      rawPayload: payload.data,
      sourceFormat: options.sourceFormat,
      dataType: options.dataType ?? "mixed",
      publicationStatus: options.publicationStatus ?? "unknown",
      sourceTimestamp: options.sourceTimestamp,
      firstSeenAt: now,
      lastSeenAt: now,
      lastChangedAt: now,
      contentFingerprint: fingerprint,
      validationState: options.errors?.some((error) => error.severity === "error") ? "invalid" : "pending",
      matchState: "unmatched",
      processingState: "staged",
      errors: options.errors ?? [],
      importRunId: options.importRunId,
      retryCount: 0,
      version: 1
    };

    await this.repository.saveStagedRecord?.(record);
    return record;
  }

  async markProcessed(record: StagedRecord, processingState: StagedRecord["processingState"]): Promise<StagedRecord> {
    const updated = {
      ...record,
      processingState,
      lastSeenAt: new Date().toISOString()
    };
    await this.repository.updateStagedRecord?.(updated);
    return updated;
  }
}

export function fingerprintPayload(payload: unknown): string {
  return createHash("sha256").update(stableStringify(stripVolatileFields(payload))).digest("hex");
}

function stripVolatileFields(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripVolatileFields);
  const volatileKeys = new Set(["fetchedAt", "importedAt", "createdAt", "updatedAt", "lastSeenAt", "lastChangedAt"]);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !volatileKeys.has(key))
      .map(([key, nested]) => [key, stripVolatileFields(nested)])
  );
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
