import type { EntityCandidate, EntityResolution, SourceIdentifier } from "../domain/types";
import { dateOnly, normaliseSearchText } from "../domain/normaliseText";

export interface ResolutionInput<TEntity> {
  incoming: TEntity;
  candidates: Array<EntityCandidate<TEntity>>;
  externalIds: SourceIdentifier[];
  name?: string;
  countryCode?: string;
  date?: string;
}

export interface ResolverThresholds {
  update: number;
  review: number;
}

const DEFAULT_THRESHOLDS: ResolverThresholds = {
  update: 0.82,
  review: 0.58
};

export class EntityResolver {
  constructor(private readonly thresholds: ResolverThresholds = DEFAULT_THRESHOLDS) {}

  resolve<TEntity>(input: ResolutionInput<TEntity>): EntityResolution<TEntity> {
    if (!input.candidates.length) {
      return {
        action: "create",
        score: 0,
        reason: "No candidate entities found.",
        incoming: input.incoming
      };
    }

    const scored = input.candidates
      .map((candidate) => ({
        candidate,
        score: scoreCandidate({
          incomingExternalIds: input.externalIds,
          candidateExternalIds: candidate.externalIds,
          incomingName: input.name,
          candidateName: getCandidateName(candidate.entity),
          incomingCountryCode: input.countryCode,
          candidateCountryCode: getCandidateCountry(candidate.entity),
          incomingDate: input.date,
          candidateDate: getCandidateDate(candidate.entity)
        })
      }))
      .sort((left, right) => right.score - left.score);

    const best = scored[0];
    if (!best) {
      return {
        action: "create",
        score: 0,
        reason: "No candidate entities found.",
        incoming: input.incoming
      };
    }

    if (best.score >= this.thresholds.update) {
      return {
        action: "update",
        score: best.score,
        reason: "Matched by source identifier or high-confidence identity attributes.",
        incoming: input.incoming,
        match: best.candidate.entity
      };
    }

    if (best.score >= this.thresholds.review) {
      return {
        action: "review",
        score: best.score,
        reason: "Candidate requires human review before merging.",
        incoming: input.incoming,
        match: best.candidate.entity
      };
    }

    return {
      action: "create",
      score: best.score,
      reason: "Candidates did not meet merge threshold.",
      incoming: input.incoming
    };
  }
}

interface ScoreInput {
  incomingExternalIds: SourceIdentifier[];
  candidateExternalIds?: SourceIdentifier[];
  incomingName?: string;
  candidateName?: string;
  incomingCountryCode?: string;
  candidateCountryCode?: string;
  incomingDate?: string;
  candidateDate?: string;
}

function scoreCandidate(input: ScoreInput): number {
  let score = 0;

  if (sharesExternalId(input.incomingExternalIds, input.candidateExternalIds)) {
    score += 0.9;
  }

  const incomingName = normaliseSearchText(input.incomingName);
  const candidateName = normaliseSearchText(input.candidateName);
  if (incomingName && candidateName) {
    if (incomingName === candidateName) {
      score += 0.45;
    } else if (tokenOverlap(incomingName, candidateName) >= 0.75) {
      score += 0.28;
    }
  }

  if (input.incomingCountryCode && input.candidateCountryCode && input.incomingCountryCode === input.candidateCountryCode) {
    score += 0.12;
  }

  if (input.incomingDate && input.candidateDate && dateOnly(input.incomingDate) === dateOnly(input.candidateDate)) {
    score += 0.18;
  }

  return Math.min(score, 1);
}

function sharesExternalId(left: SourceIdentifier[], right: SourceIdentifier[] | undefined): boolean {
  if (!left.length || !right?.length) {
    return false;
  }

  return left.some((leftId) =>
    right.some(
      (rightId) =>
        normaliseSearchText(leftId.sourceSystem) === normaliseSearchText(rightId.sourceSystem) &&
        normaliseSearchText(leftId.sourceId) === normaliseSearchText(rightId.sourceId)
    )
  );
}

function tokenOverlap(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  const shared = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function getCandidateName(entity: unknown): string | undefined {
  const record = entity as Record<string, unknown>;
  return stringValue(record.name) ?? stringValue(record.displayName) ?? [record.riderName, record.horseName].filter(Boolean).join(" ");
}

function getCandidateCountry(entity: unknown): string | undefined {
  return stringValue((entity as Record<string, unknown>).countryCode);
}

function getCandidateDate(entity: unknown): string | undefined {
  const record = entity as Record<string, unknown>;
  return stringValue(record.startDate) ?? stringValue(record.startTime) ?? stringValue(record.resultDate) ?? stringValue(record.rankingDate);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
