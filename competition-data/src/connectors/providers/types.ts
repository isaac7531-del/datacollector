import type { NormalizedCompetitionGraph } from "../../domain/types";

export type ProviderCapability = "event_search" | "entries" | "start_lists" | "live_results" | "final_results" | "pdf_results" | "api_results";

export interface ProviderDetectionEvidence {
  resultUrl?: string;
  hostname?: string;
  htmlMetadata?: string[];
  pageSignatures?: string[];
  documentFormats?: string[];
}

export interface ResultProviderAdapter {
  id: string;
  name: string;
  capabilities: ProviderCapability[];
  detect(evidence: ProviderDetectionEvidence): boolean;
  collect?(url: string): Promise<NormalizedCompetitionGraph[]>;
}

export interface RegisteredProvider {
  id: string;
  name: string;
  hostnames: string[];
  capabilities: ProviderCapability[];
  status: "registered" | "scaffolded" | "working" | "blocked" | "disabled";
  notes?: string;
}
