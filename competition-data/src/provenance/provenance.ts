import type { NormalizedCompetitionGraph, ProvenanceRecord, RawCompetitionPayload } from "../domain/types";

export function provenanceFromPayload(payload: RawCompetitionPayload, importBatchId?: string): ProvenanceRecord {
  return {
    source: payload.source,
    connectorId: payload.connectorId,
    fetchedAt: payload.fetchedAt,
    sourceUrl: payload.sourceUrl,
    sourceChecksum: payload.checksum,
    rawRecordId: payload.rawRecordId,
    importBatchId
  };
}

export function attachPayloadProvenance(
  graph: NormalizedCompetitionGraph,
  payload: RawCompetitionPayload,
  importBatchId?: string
): NormalizedCompetitionGraph {
  return {
    ...graph,
    provenance: [...graph.provenance, provenanceFromPayload(payload, importBatchId)]
  };
}
