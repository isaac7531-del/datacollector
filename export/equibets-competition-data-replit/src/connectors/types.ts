import type {
  CompetitionDiscipline,
  ConnectorStatus,
  DataSource,
  DiscoveryItem,
  RawCompetitionPayload,
  SourceIdentifier
} from "../domain/types";
import type { ConnectorHealth, PublicationStatus } from "../domain/records";

export type ConnectorCapability =
  | "discover"
  | "fetch_results"
  | "fetch_entries"
  | "fetch_rankings"
  | "fetch_horses"
  | "fetch_riders"
  | "discoverEvents"
  | "fetchEvent"
  | "fetchClasses"
  | "fetchEntries"
  | "fetchResults"
  | "fetchRankings"
  | "fetchHorse"
  | "fetchRider"
  | "checkForUpdates"
  | "healthCheck"
  | "preview"
  | "stage";

export type SourceAuthority = "official" | "verified" | "public" | "user_confirmed" | "user_unverified" | "unknown";

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface RateLimitPolicy {
  requestsPerMinute?: number;
  concurrentRequests?: number;
}

export interface ConnectorDescriptor {
  id: string;
  name: string;
  status: ConnectorStatus;
  source: DataSource;
  sourceOrganisation?: string;
  countryCode?: string;
  disciplineCoverage?: CompetitionDiscipline[];
  competitionLevels?: string[];
  supportedRecordTypes?: Array<"event" | "class" | "entry" | "result" | "phase_result" | "ranking" | "horse" | "rider">;
  sourceAuthority?: SourceAuthority;
  collectionMethod?: "api" | "feed" | "export" | "file" | "page" | "upload" | "manual";
  publicSourceUrlPattern?: string;
  checkFrequencyMs?: number;
  rateLimit?: RateLimitPolicy;
  retryPolicy?: RetryPolicy;
  supportsBackfill?: boolean;
  resultsMayBeProvisional?: boolean;
  requiresHumanReview?: boolean;
  capabilities: ConnectorCapability[];
  complianceNote: string;
}

export interface DiscoveryContext {
  fromDate?: string;
  toDate?: string;
  countryCodes?: string[];
  sourceIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface CollectionContext {
  importBatchId: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface ConnectorUpdateCheck {
  sourceIdentifier: SourceIdentifier;
  changed: boolean;
  publicationStatus?: PublicationStatus;
  checkedAt: string;
}

export interface CompetitionDataConnector {
  descriptor: ConnectorDescriptor;
  discover(context: DiscoveryContext): Promise<DiscoveryItem[]>;
  collect(item: DiscoveryItem, context: CollectionContext): Promise<RawCompetitionPayload[]>;
  discoverEvents?(context: DiscoveryContext): Promise<DiscoveryItem[]>;
  fetchEvent?(item: DiscoveryItem, context: CollectionContext): Promise<RawCompetitionPayload[]>;
  fetchClasses?(item: DiscoveryItem, context: CollectionContext): Promise<RawCompetitionPayload[]>;
  fetchEntries?(item: DiscoveryItem, context: CollectionContext): Promise<RawCompetitionPayload[]>;
  fetchResults?(item: DiscoveryItem, context: CollectionContext): Promise<RawCompetitionPayload[]>;
  fetchRankings?(item: DiscoveryItem, context: CollectionContext): Promise<RawCompetitionPayload[]>;
  fetchHorse?(identifier: SourceIdentifier, context: CollectionContext): Promise<RawCompetitionPayload[]>;
  fetchRider?(identifier: SourceIdentifier, context: CollectionContext): Promise<RawCompetitionPayload[]>;
  checkForUpdates?(context: DiscoveryContext): Promise<ConnectorUpdateCheck[]>;
  healthCheck?(): Promise<ConnectorHealth>;
}

export class DisabledConnectorError extends Error {
  constructor(connectorId: string) {
    super(`Connector "${connectorId}" is disabled.`);
    this.name = "DisabledConnectorError";
  }
}
