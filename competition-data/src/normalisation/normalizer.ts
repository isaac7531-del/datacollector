import type { NormalizedCompetitionGraph, RawCompetitionPayload } from "../domain/types";

export interface CompetitionDataNormalizer {
  id: string;
  supports(payload: RawCompetitionPayload): boolean;
  normalize(payload: RawCompetitionPayload): Promise<NormalizedCompetitionGraph[]>;
}

export class NormalizerRegistry {
  private readonly normalizers: CompetitionDataNormalizer[] = [];

  register(normalizer: CompetitionDataNormalizer): this {
    if (this.normalizers.some((registered) => registered.id === normalizer.id)) {
      throw new Error(`Normalizer "${normalizer.id}" is already registered.`);
    }

    this.normalizers.push(normalizer);
    return this;
  }

  requireForPayload(payload: RawCompetitionPayload): CompetitionDataNormalizer {
    const normalizer = this.normalizers.find((candidate) => candidate.supports(payload));
    if (!normalizer) {
      throw new Error(`No normalizer registered for connector "${payload.connectorId}" and content type "${payload.contentType ?? "unknown"}".`);
    }

    return normalizer;
  }

  list(): CompetitionDataNormalizer[] {
    return [...this.normalizers];
  }
}

export function createPassThroughGraphNormalizer(connectorIds?: string[]): CompetitionDataNormalizer {
  return {
    id: "pass-through-normalized-graph",
    supports(payload: RawCompetitionPayload): boolean {
      if (connectorIds?.length && !connectorIds.includes(payload.connectorId)) {
        return false;
      }

      return isNormalizedCompetitionGraph(payload.data) || isNormalizedCompetitionGraphArray(payload.data);
    },
    async normalize(payload: RawCompetitionPayload): Promise<NormalizedCompetitionGraph[]> {
      if (isNormalizedCompetitionGraphArray(payload.data)) {
        return payload.data;
      }

      if (isNormalizedCompetitionGraph(payload.data)) {
        return [payload.data];
      }

      throw new Error("Payload is not a normalized competition graph.");
    }
  };
}

function isNormalizedCompetitionGraphArray(value: unknown): value is NormalizedCompetitionGraph[] {
  return Array.isArray(value) && value.every(isNormalizedCompetitionGraph);
}

function isNormalizedCompetitionGraph(value: unknown): value is NormalizedCompetitionGraph {
  if (!value || typeof value !== "object") {
    return false;
  }

  const graph = value as Partial<NormalizedCompetitionGraph>;
  return !!graph.competition && Array.isArray(graph.events) && Array.isArray(graph.results);
}
