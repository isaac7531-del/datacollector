import type { DataSource, NormalizedCompetitionGraph, RawCompetitionPayload } from "../../domain/types";
import type { DiscoveryItem } from "../../domain/types";

export interface RechenstelleConnectorOptions {
  id?: string;
  enabled: boolean;
  agendaUrls: string[];
  userAgent?: string;
  maxPdfBytes?: number;
}

export interface RechenstelleEventDocument {
  url: string;
  label: string;
  documentType: "start_list" | "dressage" | "intermediate" | "final" | "fence_report" | "other";
  className?: string;
  classCode?: string;
}

export interface RechenstelleDiscoveredEvent {
  id: string;
  url: string;
  name: string;
  countryCode?: string;
  discipline?: "eventing" | "dressage" | "jumping" | "other";
  startDate?: string;
  endDate?: string;
  classes: string[];
  documents: RechenstelleEventDocument[];
}

export interface RechenstellePdfResultRow {
  startNumber: string;
  horseName: string;
  riderName: string;
  nation?: string;
  placing?: number;
  finalScore?: number;
  dressageScore?: number;
  dressageRank?: number;
  crossCountryJumpingPenalties?: number;
  crossCountryTimePenalties?: number;
  crossCountryElapsedTime?: string;
  showjumpingJumpingPenalties?: number;
  showjumpingTimePenalties?: number;
  status: "placed" | "eliminated" | "withdrawn" | "retired" | "unknown";
  extractionConfidence: "high" | "medium" | "low";
  rawText: string;
}

export interface RechenstellePayload {
  event: RechenstelleDiscoveredEvent;
  document: RechenstelleEventDocument;
  text: string;
  rows: RechenstellePdfResultRow[];
  graph: NormalizedCompetitionGraph;
}

export interface RechenstelleRawPayload extends RawCompetitionPayload<RechenstellePayload[]> {}

export const rechenstelleSource: DataSource = {
  id: "rechenstelle",
  name: "Rechenstelle",
  kind: "event_organiser",
  mode: "public_file",
  official: true,
  sourceUrl: "https://www.rechenstelle.de/"
};

export interface RechenstelleDiscoveryItem extends DiscoveryItem {
  metadata: {
    event: RechenstelleDiscoveredEvent;
  };
}
