import { createHash } from "crypto";
import type { CompetitionResult } from "../domain/types";
import type { PublicationStatus } from "../domain/records";
import { normaliseSearchText } from "../domain/normaliseText";

export interface ResultDuplicateKeyInput {
  result: CompetitionResult;
  eventId?: string;
  classId?: string;
  horseId?: string;
  riderId?: string;
  combinationId?: string;
  publicationStatus?: PublicationStatus;
}

export function createResultDuplicateFingerprint(input: ResultDuplicateKeyInput): string {
  const result = input.result;
  const stable = [
    firstExternalId(result.externalIds),
    input.eventId ?? result.competitionExternalId?.sourceId,
    input.classId ?? result.eventExternalId?.sourceId,
    input.horseId ?? result.horseExternalId?.sourceId ?? normaliseSearchText(result.horseName),
    input.riderId ?? result.riderExternalId?.sourceId ?? normaliseSearchText(result.riderName),
    input.combinationId,
    result.startNumber,
    result.resultDate,
    result.score,
    result.placing,
    result.status,
    input.publicationStatus
  ];

  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

export function appearsToBeMaterialResultChange(left: CompetitionResult, right: CompetitionResult): boolean {
  return (
    left.score !== right.score ||
    left.placing !== right.placing ||
    left.status !== right.status ||
    left.horseName !== right.horseName ||
    left.riderName !== right.riderName ||
    JSON.stringify(left.metadata?.eventing) !== JSON.stringify(right.metadata?.eventing)
  );
}

function firstExternalId(externalIds: CompetitionResult["externalIds"]): string | undefined {
  const externalId = externalIds[0];
  return externalId ? `${externalId.sourceSystem}:${externalId.sourceId}` : undefined;
}
