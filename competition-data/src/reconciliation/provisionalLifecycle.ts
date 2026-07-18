import type { CompetitionDataRepository } from "../adapters/repository";
import type { CompetitionResult } from "../domain/types";
import type { PublicationStatus, ResultVersion, SourceReference } from "../domain/records";
import { createResultDuplicateFingerprint, appearsToBeMaterialResultChange } from "./duplicateDetection";
import { createCompetitionDataEvent, type EventPublisher } from "../events/events";

export interface ProvisionalLifecycleResult {
  changed: boolean;
  status: PublicationStatus;
  version: ResultVersion;
}

export class ProvisionalResultLifecycle {
  constructor(private readonly repository: CompetitionDataRepository, private readonly publisher?: EventPublisher) {}

  async record(resultId: string, result: CompetitionResult, status: PublicationStatus, sourceReference: SourceReference): Promise<ProvisionalLifecycleResult> {
    const existingVersions = (await this.repository.listResultVersions?.(resultId)) ?? [];
    const latest = existingVersions.at(-1);
    const fingerprint = createResultDuplicateFingerprint({ result, publicationStatus: status });
    const changed = !latest || latest.resultFingerprint !== fingerprint || appearsToBeMaterialResultChange(latest.result as CompetitionResult, result);
    const version: ResultVersion = {
      id: `version_${resultId}_${Date.now()}`,
      canonicalResultId: resultId,
      sourceReference,
      resultFingerprint: fingerprint,
      publicationStatus: status,
      verificationState: status === "final" || status === "corrected" ? "source_verified" : "unverified",
      result,
      fieldProvenance: [],
      createdAt: new Date().toISOString(),
      changeReason: changed ? `Result recorded as ${status}.` : "Unchanged recheck."
    };
    await this.repository.saveResultVersion?.(version);
    if (changed) {
      const eventType =
        status === "final"
          ? "competitionData.result.finalised"
          : status === "corrected"
            ? "competitionData.result.corrected"
            : status === "withdrawn"
              ? "competitionData.result.withdrawn"
              : "competitionData.result.updated";
      const event = createCompetitionDataEvent(eventType, { resultId, status, result }, `provisional-${resultId}`);
      await this.publisher?.publish(event);
      await this.repository.appendEvent?.(event);
    }
    return { changed, status, version };
  }
}
