import type {
  CompetitionDiscipline,
  CompetitionStatus,
  DataQualityIssue,
  DataSource,
  ISODateString,
  ISODateTimeString,
  ResultStatus,
  SourceIdentifier
} from "./types";

export type PublicationStatus = "draft" | "provisional" | "updated" | "final" | "corrected" | "withdrawn" | "superseded" | "unknown";
export type VerificationState = "unverified" | "user_confirmed" | "source_verified" | "administrator_verified" | "rejected";
export type ProcessingState = "pending" | "staged" | "validated" | "normalised" | "resolved" | "persisted" | "failed" | "rolled_back";
export type MatchState = "unmatched" | "matched" | "candidate" | "conflict" | "ignored";
export type ImportRunStatus = "pending" | "running" | "completed" | "failed" | "partially_completed" | "rolled_back";
export type ImportTriggerType = "scheduled" | "manual" | "admin" | "cli" | "worker" | "retry" | "backfill" | "demo";
export type SourceAuthorityTier =
  | "international_federation_final"
  | "national_federation_final"
  | "event_provider_final"
  | "organising_committee_final"
  | "regional_federation_verified"
  | "public_event_organiser"
  | "user_confirmed"
  | "user_unverified"
  | "other_public";

export interface Organisation {
  id?: string;
  externalIds: SourceIdentifier[];
  name: string;
  countryCode?: string;
  websiteUrl?: string;
  authorityTier?: SourceAuthorityTier;
  metadata?: Record<string, unknown>;
}

export interface Federation extends Organisation {
  federationLevel: "international" | "national" | "state" | "regional" | "club" | "other";
  disciplines?: CompetitionDiscipline[];
}

export interface Venue {
  id?: string;
  externalIds: SourceIdentifier[];
  name: string;
  countryCode?: string;
  stateOrRegion?: string;
  locality?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
}

export interface CompetitionClass {
  id?: string;
  eventId?: string;
  externalIds: SourceIdentifier[];
  name: string;
  classCode?: string;
  discipline?: CompetitionDiscipline;
  level?: string;
  section?: string;
  status?: CompetitionStatus;
  startTime?: ISODateTimeString;
  metadata?: Record<string, unknown>;
}

export interface HorseRiderCombination {
  id?: string;
  externalIds: SourceIdentifier[];
  horseId?: string;
  riderId?: string;
  horseExternalId?: SourceIdentifier;
  riderExternalId?: SourceIdentifier;
  horseName?: string;
  riderName?: string;
  countryCode?: string;
  firstSeenAt?: ISODateTimeString;
  lastSeenAt?: ISODateTimeString;
  metadata?: Record<string, unknown>;
}

export interface EventingPhaseResult {
  dressageScore?: number;
  dressagePosition?: number;
  crossCountryJumpingPenalties?: number;
  crossCountryTimePenalties?: number;
  crossCountryElapsedTime?: string;
  crossCountryOptimumTime?: string;
  crossCountryStatus?: ResultStatus;
  showjumpingJumpingPenalties?: number;
  showjumpingTimePenalties?: number;
  showjumpingElapsedTime?: string;
  finalScore?: number;
  finalPlacing?: number;
  completionStatus?: ResultStatus;
  eliminationReason?: string;
  merStatus?: "achieved" | "not_achieved" | "unknown";
  qualificationStatus?: "qualified" | "not_qualified" | "unknown";
  publicationStatus?: PublicationStatus;
}

export interface SourceReference {
  id?: string;
  source: DataSource;
  sourceRecordId?: string;
  sourcePublicIdentifier?: string;
  sourceUrl?: string;
  sourceChecksum?: string;
  publicationStatus?: PublicationStatus;
  sourceTimestamp?: ISODateTimeString;
  importedAt: ISODateTimeString;
}

export interface FieldProvenance {
  fieldPath: string;
  sourceReference: SourceReference;
  authorityScore: number;
}

export interface ResultVersion {
  id?: string;
  canonicalResultId?: string;
  sourceReference: SourceReference;
  resultFingerprint: string;
  publicationStatus: PublicationStatus;
  verificationState: VerificationState;
  result: unknown;
  fieldProvenance: FieldProvenance[];
  createdAt: ISODateTimeString;
  supersededAt?: ISODateTimeString;
  supersededByVersionId?: string;
  changeReason?: string;
}

export interface ImportRun {
  id: string;
  connectorIds: string[];
  triggerType: ImportTriggerType;
  initiatedByUserId?: string;
  status: ImportRunStatus;
  startedAt: ISODateTimeString;
  finishedAt?: ISODateTimeString;
  recordsDiscovered: number;
  recordsFetched: number;
  recordsStaged: number;
  recordsValidated: number;
  recordsAccepted: number;
  recordsUpdated: number;
  recordsUnresolved: number;
  recordsRejected: number;
  conflicts: number;
  errors: DataQualityIssue[];
  retryCount: number;
  sourceCheckTime?: ISODateTimeString;
}

export interface StagedRecord {
  id: string;
  connectorId: string;
  sourceOrganisation: string;
  sourceRecordId?: string;
  sourceUrl?: string;
  sourcePublicIdentifier?: string;
  rawPayload?: unknown;
  rawPayloadReference?: string;
  sourceFormat: "csv" | "excel" | "json" | "xml" | "manual" | "other";
  dataType: "event" | "class" | "entry" | "result" | "phase_result" | "horse" | "rider" | "ranking" | "mixed";
  publicationStatus: PublicationStatus;
  sourceTimestamp?: ISODateTimeString;
  firstSeenAt: ISODateTimeString;
  lastSeenAt: ISODateTimeString;
  lastChangedAt: ISODateTimeString;
  contentFingerprint: string;
  validationState: "pending" | "valid" | "invalid";
  matchState: MatchState;
  processingState: ProcessingState;
  errors: DataQualityIssue[];
  importRunId: string;
  retryCount: number;
  version: number;
  previousFingerprint?: string;
}

export interface ConflictRecord {
  id?: string;
  entityType: "event" | "class" | "horse" | "rider" | "combination" | "entry" | "result" | "phase_result" | "ranking";
  entityId?: string;
  fieldPath: string;
  incomingValue: unknown;
  existingValue: unknown;
  sourceReferences: SourceReference[];
  material: boolean;
  status: "open" | "resolved" | "ignored";
  resolutionReason?: string;
  resolvedByUserId?: string;
  resolvedAt?: ISODateTimeString;
  createdAt: ISODateTimeString;
}

export interface ResolutionCandidate {
  id?: string;
  entityType: "organisation" | "venue" | "event" | "class" | "horse" | "rider" | "combination" | "result";
  incoming: unknown;
  candidates: Array<{ entity: unknown; score: number; reasons: string[] }>;
  recommendedAction: "link" | "create" | "review" | "reject";
  confidenceScore: number;
  status: "pending" | "confirmed" | "rejected";
  createdAt: ISODateTimeString;
  resolvedAt?: ISODateTimeString;
}

export interface ConnectorHealth {
  connectorId: string;
  status: "unknown" | "healthy" | "degraded" | "failing" | "disabled";
  checkedAt: ISODateTimeString;
  lastSuccessAt?: ISODateTimeString;
  lastFailureAt?: ISODateTimeString;
  nextRunAt?: ISODateTimeString;
  message?: string;
  consecutiveFailures: number;
}

export interface SchedulerLock {
  id: string;
  scope: string;
  ownerId: string;
  acquiredAt: ISODateTimeString;
  expiresAt: ISODateTimeString;
}

export interface CanonicalSelectionInput {
  authorityScore: number;
  publicationStatus: PublicationStatus;
  matchConfidence: number;
  completenessScore: number;
  verificationState: VerificationState;
  sourceRecency: ISODateTimeString;
  administratorPinned?: boolean;
}

export interface NationalConnectorMapping {
  organisationName: string;
  countryCode: string;
  discipline?: CompetitionDiscipline;
  authorityScore: number;
  fileFormat: "csv" | "excel" | "json" | "xml";
  encoding?: BufferEncoding;
  delimiter?: string;
  dateFormat?: string;
  timeFormat?: string;
  decimalFormat?: "dot" | "comma";
  headerAliases?: Record<string, string[]>;
  statusMappings?: Record<string, ResultStatus>;
  eventMappings: Record<string, string>;
  classMappings?: Record<string, string>;
  horseMappings?: Record<string, string>;
  riderMappings?: Record<string, string>;
  resultMappings?: Record<string, string>;
  phaseResultMappings?: Record<string, string>;
  sourceUrlPatterns?: string[];
  provisionalResultRules?: string[];
  finalResultRules?: string[];
}

export interface CompetitionHistoryQuery {
  horseId?: string;
  riderId?: string;
  combinationId?: string;
  fromDate?: ISODateString;
  toDate?: ISODateString;
  includeVersions?: boolean;
}
