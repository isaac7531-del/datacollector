import type { CompetitionDataRepository } from "../adapters/repository";
import type { ConflictRecord, SourceReference } from "../domain/records";

export interface ConflictInput {
  entityType: ConflictRecord["entityType"];
  entityId?: string;
  fieldPath: string;
  incomingValue: unknown;
  existingValue: unknown;
  sourceReferences: SourceReference[];
}

export class ConflictService {
  constructor(private readonly repository: CompetitionDataRepository) {}

  async detect(input: ConflictInput): Promise<ConflictRecord | undefined> {
    if (!isMaterialConflict(input.fieldPath, input.incomingValue, input.existingValue)) {
      return undefined;
    }

    const conflict: ConflictRecord = {
      id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      entityType: input.entityType,
      entityId: input.entityId,
      fieldPath: input.fieldPath,
      incomingValue: input.incomingValue,
      existingValue: input.existingValue,
      sourceReferences: input.sourceReferences,
      material: true,
      status: "open",
      createdAt: new Date().toISOString()
    };
    await this.repository.saveConflict?.(conflict);
    return conflict;
  }

  async resolve(conflictId: string, reason: string, resolvedByUserId?: string): Promise<ConflictRecord | undefined> {
    const conflict = await this.repository.getConflict?.(conflictId);
    if (!conflict) return undefined;
    const updated = {
      ...conflict,
      status: "resolved" as const,
      resolutionReason: reason,
      resolvedByUserId,
      resolvedAt: new Date().toISOString()
    };
    await this.repository.updateConflict?.(updated);
    return updated;
  }
}

export function isMaterialConflict(fieldPath: string, incomingValue: unknown, existingValue: unknown): boolean {
  if (JSON.stringify(incomingValue) === JSON.stringify(existingValue)) {
    return false;
  }

  return [
    "score",
    "placing",
    "status",
    "horse",
    "rider",
    "class",
    "eventDate",
    "eliminationReason",
    "metadata.eventing",
    "publicationStatus"
  ].some((materialPath) => fieldPath.includes(materialPath));
}
