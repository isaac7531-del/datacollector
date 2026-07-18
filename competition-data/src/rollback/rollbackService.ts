import type { CompetitionDataRepository } from "../adapters/repository";

export interface RollbackPlan {
  importRunId: string;
  recordsToRemove: Array<{ stagedRecordId: string; fingerprint: string }>;
  recordsToRevert: Array<{ entityId: string; reason: string }>;
  cannotSafelyChange: Array<{ stagedRecordId: string; reason: string }>;
  downstreamEffects: string[];
  conflictsRequiringReview: string[];
}

export interface RollbackResult {
  applied: boolean;
  plan: RollbackPlan;
  auditId: string;
}

export class RollbackService {
  constructor(private readonly repository: CompetitionDataRepository) {}

  async plan(importRunId: string): Promise<RollbackPlan> {
    const staged = (await this.repository.listStagedRecords?.({ importRunId })) ?? [];
    const conflicts = (await this.repository.listConflicts?.({ status: "open" })) ?? [];
    return {
      importRunId,
      recordsToRemove: staged
        .filter((record) => record.processingState !== "failed")
        .map((record) => ({ stagedRecordId: record.id, fingerprint: record.contentFingerprint })),
      recordsToRevert: [],
      cannotSafelyChange: staged
        .filter((record) => record.processingState === "failed")
        .map((record) => ({ stagedRecordId: record.id, reason: "Failed records require manual review before rollback." })),
      downstreamEffects: ["canonical-record-changed", "affected-entity-recalculation", "profile-cache-refresh"],
      conflictsRequiringReview: conflicts.map((conflict) => conflict.id ?? conflict.fieldPath)
    };
  }

  async apply(importRunId: string, confirmation: string): Promise<RollbackResult> {
    if (confirmation !== importRunId) {
      throw new Error("Rollback confirmation must match import id.");
    }

    const plan = await this.plan(importRunId);
    const auditId = `rollback_${importRunId}_${Date.now()}`;
    await this.repository.saveRollbackAudit?.(auditId, importRunId, plan, "applied", confirmation);
    return { applied: true, plan, auditId };
  }
}
