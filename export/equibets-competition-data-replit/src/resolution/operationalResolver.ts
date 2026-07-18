import type { EntityCandidate, EntityResolution, SourceIdentifier } from "../domain/types";
import { normaliseSearchText } from "../domain/normaliseText";

export type ResolvableEntityType = "horse" | "rider" | "event" | "class" | "venue" | "organisation" | "combination" | "result";

export interface EntityThreshold {
  update: number;
  review: number;
}

export interface OperationalResolutionInput<TEntity> {
  entityType: ResolvableEntityType;
  incoming: TEntity;
  candidates: Array<EntityCandidate<TEntity>>;
  externalIds: SourceIdentifier[];
  name?: string;
  countryCode?: string;
  date?: string;
  yearOfBirth?: number;
  manualOverrideId?: string;
}

export interface ScoredCandidate<TEntity> {
  candidate: EntityCandidate<TEntity>;
  score: number;
  reasons: string[];
}

export class OperationalEntityResolver {
  private readonly rejected = new Set<string>();

  constructor(private readonly thresholds: Partial<Record<ResolvableEntityType | "default", EntityThreshold>> = {}) {}

  reject(incomingKey: string, candidateKey: string): void {
    this.rejected.add(`${incomingKey}:${candidateKey}`);
  }

  resolve<TEntity>(input: OperationalResolutionInput<TEntity>): EntityResolution<TEntity> & { candidates: ScoredCandidate<TEntity>[]; reasons: string[] } {
    const threshold = this.thresholds[input.entityType] ?? this.thresholds.default ?? { update: 0.82, review: 0.58 };
    const incomingKey = stableEntityKey(input.externalIds, input.name);

    const deterministicConflict = input.candidates.find((candidate) =>
      hasConflictingDeterministicId(input.externalIds, candidate.externalIds)
    );
    if (deterministicConflict) {
      return {
        action: "review",
        score: 0,
        reason: "Conflicting deterministic identifiers prevent automatic merge.",
        reasons: ["conflicting-deterministic-id"],
        incoming: input.incoming,
        match: deterministicConflict.entity,
        candidates: [{ candidate: deterministicConflict, score: 0, reasons: ["conflicting-deterministic-id"] }]
      };
    }

    const scored = input.candidates
      .filter((candidate) => !this.rejected.has(`${incomingKey}:${stableEntityKey(candidate.externalIds ?? [], readName(candidate.entity))}`))
      .map((candidate) => scoreCandidate(input, candidate))
      .sort((left, right) => right.score - left.score);

    if (input.manualOverrideId) {
      const override = scored.find((candidate) => readId(candidate.candidate.entity) === input.manualOverrideId);
      if (override) {
        return {
          action: "update",
          score: 1,
          reason: "Manual override selected this match.",
          reasons: ["manual-override"],
          incoming: input.incoming,
          match: override.candidate.entity,
          candidates: scored
        };
      }
    }

    const best = scored[0];
    if (!best) {
      return { action: "create", score: 0, reason: "No candidates found.", reasons: [], incoming: input.incoming, candidates: [] };
    }

    if (best.score >= threshold.update) {
      return {
        action: "update",
        score: best.score,
        reason: best.reasons.join("; "),
        reasons: best.reasons,
        incoming: input.incoming,
        match: best.candidate.entity,
        candidates: scored
      };
    }

    if (best.score >= threshold.review) {
      return {
        action: "review",
        score: best.score,
        reason: best.reasons.join("; "),
        reasons: best.reasons,
        incoming: input.incoming,
        match: best.candidate.entity,
        candidates: scored
      };
    }

    return {
      action: "create",
      score: best.score,
      reason: "Best candidate below review threshold.",
      reasons: best.reasons,
      incoming: input.incoming,
      candidates: scored
    };
  }
}

function scoreCandidate<TEntity>(input: OperationalResolutionInput<TEntity>, candidate: EntityCandidate<TEntity>): ScoredCandidate<TEntity> {
  const reasons: string[] = [];
  let score = 0;
  if (sharesExternalId(input.externalIds, candidate.externalIds)) {
    score += 0.9;
    reasons.push("shared-deterministic-identifier");
  }
  const incomingName = normalizeEntityName(input.name, input.entityType);
  const candidateName = normalizeEntityName(readName(candidate.entity), input.entityType);
  if (incomingName && candidateName) {
    if (incomingName === candidateName) {
      score += 0.42;
      reasons.push("normalized-name-exact");
    } else if (incomingName.replace(/\s+/g, "") === candidateName.replace(/\s+/g, "")) {
      score += 0.45;
      reasons.push("normalized-name-compact");
    } else {
      const overlap = tokenOverlap(incomingName, candidateName);
      if (overlap >= 0.75) {
        score += 0.24;
        reasons.push("normalized-name-token-overlap");
      }
    }
  }
  const candidateCountry = normalizeCountry(readString(candidate.entity, "countryCode"));
  const incomingCountry = normalizeCountry(input.countryCode);
  if (incomingCountry && candidateCountry && incomingCountry === candidateCountry) {
    score += 0.1;
    reasons.push("country-match");
  }
  const candidateYear = readNumber(candidate.entity, "yearOfBirth");
  if (input.yearOfBirth && candidateYear) {
    const difference = Math.abs(input.yearOfBirth - candidateYear);
    if (difference === 0) {
      score += 0.16;
      reasons.push("birth-year-exact");
    } else if (difference === 1) {
      score += 0.06;
      reasons.push("birth-year-tolerance");
    } else {
      score -= 0.35;
      reasons.push("birth-year-conflict");
    }
  }
  return { candidate, score: Math.max(0, Math.min(score, 1)), reasons };
}

export function normalizeEntityName(value: string | undefined, entityType: ResolvableEntityType): string {
  let normalized = normaliseSearchText(value).replace(/\b(the|a|an)\b/g, " ").replace(/\s+/g, " ").trim();
  if (entityType === "horse") {
    normalized = normalized.replace(/\b(ii|iii|iv|jnr|junior|sr|senior)\b$/g, "").trim();
  }
  return normalized;
}

export function normalizeCountry(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLocaleUpperCase("en");
  if (normalized === "AUS") return "AU";
  if (normalized === "NZL") return "NZ";
  if (normalized === "GBR" || normalized === "UK") return "GB";
  if (normalized === "USA") return "US";
  return normalized;
}

function sharesExternalId(left: SourceIdentifier[], right: SourceIdentifier[] | undefined): boolean {
  return left.some((leftId) =>
    right?.some((rightId) => normaliseSearchText(leftId.sourceSystem) === normaliseSearchText(rightId.sourceSystem) && normaliseSearchText(leftId.sourceId) === normaliseSearchText(rightId.sourceId))
  );
}

function hasConflictingDeterministicId(left: SourceIdentifier[], right: SourceIdentifier[] | undefined): boolean {
  const deterministicSystems = new Set(["fei", "national", "national_federation", "horse_registration", "rider_membership"]);
  return left.some((leftId) =>
    right?.some(
      (rightId) =>
        deterministicSystems.has(normaliseSearchText(leftId.sourceSystem)) &&
        normaliseSearchText(leftId.sourceSystem) === normaliseSearchText(rightId.sourceSystem) &&
        normaliseSearchText(leftId.sourceId) !== normaliseSearchText(rightId.sourceId)
    )
  );
}

function tokenOverlap(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter(Boolean));
  const rightTokens = new Set(right.split(" ").filter(Boolean));
  const shared = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  return shared / Math.max(leftTokens.size || 1, rightTokens.size || 1);
}

function stableEntityKey(externalIds: SourceIdentifier[], name?: string): string {
  return externalIds[0] ? `${externalIds[0].sourceSystem}:${externalIds[0].sourceId}` : normalizeEntityName(name, "horse");
}

function readName(entity: unknown): string | undefined {
  return readString(entity, "name") ?? readString(entity, "displayName") ?? [readString(entity, "riderName"), readString(entity, "horseName")].filter(Boolean).join(" ");
}

function readId(entity: unknown): string | undefined {
  return readString(entity, "id");
}

function readString(entity: unknown, key: string): string | undefined {
  const value = (entity as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function readNumber(entity: unknown, key: string): number | undefined {
  const value = (entity as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}
