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
}

export class InMemoryCompetitionDataRepository implements CompetitionDataRepository {
  readonly competitions: Competition[] = [];
  readonly events: CompetitionEvent[] = [];
  readonly horses: Horse[] = [];
  readonly riders: Rider[] = [];
  readonly results: CompetitionResult[] = [];
  readonly entries: EntryListItem[] = [];
  readonly rankings: RankingRecord[] = [];

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

function applyOne<TEntity extends { id?: string }>(
  collection: TEntity[],
  resolution: { action: string; incoming: TEntity; match?: TEntity },
  result: ReconciliationApplyResult
): void {
  if (resolution.action === "create") {
    collection.push({ ...resolution.incoming, id: resolution.incoming.id ?? cryptoSafeId() });
    result.created += 1;
    return;
  }

  if (resolution.action === "update" && resolution.match) {
    const index = collection.findIndex((entity) => entity === resolution.match || (!!entity.id && entity.id === resolution.match?.id));
    if (index >= 0) {
      collection[index] = { ...resolution.match, ...resolution.incoming, id: resolution.match.id ?? resolution.incoming.id };
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
