import type { CompetitionDataRepository } from "../adapters/repository";
import type {
  Competition,
  CompetitionEvent,
  CompetitionResult,
  EntryListItem,
  Horse,
  NormalizedCompetitionGraph,
  RankingRecord,
  ReconciliationPlan,
  Rider
} from "../domain/types";
import { EntityResolver } from "../resolution/entityResolver";

export interface ReconcilerOptions {
  repository: CompetitionDataRepository;
  resolver?: EntityResolver;
}

export class Reconciler {
  private readonly resolver: EntityResolver;

  constructor(private readonly options: ReconcilerOptions) {
    this.resolver = options.resolver ?? new EntityResolver();
  }

  async buildPlan(graph: NormalizedCompetitionGraph): Promise<ReconciliationPlan> {
    const competitionCandidates = await this.options.repository.findCompetitionCandidates({
      externalIds: graph.competition.externalIds,
      name: graph.competition.name,
      countryCode: graph.competition.countryCode,
      date: graph.competition.startDate
    });

    return {
      competition: this.resolveCompetition(graph.competition, competitionCandidates),
      events: await Promise.all(graph.events.map((event) => this.resolveEvent(event))),
      horses: await Promise.all(graph.horses.map((horse) => this.resolveHorse(horse))),
      riders: await Promise.all(graph.riders.map((rider) => this.resolveRider(rider))),
      results: await Promise.all(graph.results.map((result) => this.resolveResult(result))),
      entries: await Promise.all(graph.entries.map((entry) => this.resolveEntry(entry))),
      rankings: await Promise.all(graph.rankings.map((ranking) => this.resolveRanking(ranking))),
      issues: graph.issues,
      provenance: graph.provenance
    };
  }

  private resolveCompetition(competition: Competition, candidates: Awaited<ReturnType<CompetitionDataRepository["findCompetitionCandidates"]>>) {
    return this.resolver.resolve({
      incoming: competition,
      candidates,
      externalIds: competition.externalIds,
      name: competition.name,
      countryCode: competition.countryCode,
      date: competition.startDate
    });
  }

  private async resolveEvent(event: CompetitionEvent) {
    const candidates = await this.options.repository.findEventCandidates({
      externalIds: event.externalIds,
      name: event.name,
      date: event.startTime
    });

    return this.resolver.resolve({
      incoming: event,
      candidates,
      externalIds: event.externalIds,
      name: event.name,
      date: event.startTime
    });
  }

  private async resolveHorse(horse: Horse) {
    const candidates = await this.options.repository.findHorseCandidates({
      externalIds: horse.externalIds,
      name: horse.name,
      countryCode: horse.countryCode
    });

    return this.resolver.resolve({
      incoming: horse,
      candidates,
      externalIds: horse.externalIds,
      name: horse.name,
      countryCode: horse.countryCode
    });
  }

  private async resolveRider(rider: Rider) {
    const candidates = await this.options.repository.findRiderCandidates({
      externalIds: rider.externalIds,
      name: rider.displayName,
      countryCode: rider.countryCode
    });

    return this.resolver.resolve({
      incoming: rider,
      candidates,
      externalIds: rider.externalIds,
      name: rider.displayName,
      countryCode: rider.countryCode
    });
  }

  private async resolveResult(result: CompetitionResult) {
    const name = [result.riderName, result.horseName].filter(Boolean).join(" ");
    const candidates = await this.options.repository.findResultCandidates({
      externalIds: result.externalIds,
      name,
      date: result.resultDate
    });

    return this.resolver.resolve({
      incoming: result,
      candidates,
      externalIds: result.externalIds,
      name,
      date: result.resultDate
    });
  }

  private async resolveEntry(entry: EntryListItem) {
    const name = [entry.riderName, entry.horseName].filter(Boolean).join(" ");
    const candidates = await this.options.repository.findEntryCandidates({
      externalIds: entry.externalIds,
      name
    });

    return this.resolver.resolve({
      incoming: entry,
      candidates,
      externalIds: entry.externalIds,
      name
    });
  }

  private async resolveRanking(ranking: RankingRecord) {
    const name = [ranking.riderName, ranking.horseName, ranking.sourceRankingName].filter(Boolean).join(" ");
    const candidates = await this.options.repository.findRankingCandidates({
      externalIds: ranking.externalIds,
      name,
      countryCode: ranking.countryCode,
      date: ranking.rankingDate
    });

    return this.resolver.resolve({
      incoming: ranking,
      candidates,
      externalIds: ranking.externalIds,
      name,
      countryCode: ranking.countryCode,
      date: ranking.rankingDate
    });
  }
}
