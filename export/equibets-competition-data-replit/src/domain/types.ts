export type ISODateString = string;
export type ISODateTimeString = string;

export type ConnectorStatus = "enabled" | "disabled";
export type DataFreshness = "historical" | "recent" | "live";
export type IngestionMode = "full_automation" | "official_api" | "official_feed" | "official_export" | "public_file" | "public_page" | "human_assisted" | "manual";

export type DataSourceKind =
  | "fei"
  | "national_federation"
  | "state_federation"
  | "regional_federation"
  | "event_organiser"
  | "ranking_provider"
  | "entry_provider"
  | "manual_upload"
  | "user_entry"
  | "other_public";

export type CompetitionDiscipline =
  | "dressage"
  | "eventing"
  | "jumping"
  | "endurance"
  | "driving"
  | "vaulting"
  | "reining"
  | "para_dressage"
  | "show_horse"
  | "showing"
  | "other";

export type CompetitionStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "unknown";
export type ResultStatus = "placed" | "eliminated" | "withdrawn" | "retired" | "disqualified" | "no_show" | "unknown";
export type ResolutionAction = "create" | "update" | "review" | "ignore";
export type DataQualitySeverity = "info" | "warning" | "error";

export interface SourceIdentifier {
  sourceSystem: string;
  sourceId: string;
  sourceUrl?: string;
}

export interface DataSource {
  id: string;
  name: string;
  kind: DataSourceKind;
  mode: IngestionMode;
  countryCode?: string;
  official: boolean;
  sourceUrl?: string;
}

export interface ProvenanceRecord {
  source: DataSource;
  connectorId: string;
  fetchedAt: ISODateTimeString;
  sourceUrl?: string;
  sourceChecksum?: string;
  licenceNote?: string;
  rawRecordId?: string;
  importBatchId?: string;
}

export interface DataQualityIssue {
  code: string;
  message: string;
  severity: DataQualitySeverity;
  path?: string;
  source?: DataSource;
}

export interface Competition {
  id?: string;
  externalIds: SourceIdentifier[];
  name: string;
  discipline?: CompetitionDiscipline;
  status: CompetitionStatus;
  startDate?: ISODateString;
  endDate?: ISODateString;
  countryCode?: string;
  stateOrRegion?: string;
  venue?: string;
  organiser?: string;
  level?: string;
  sourceUpdatedAt?: ISODateTimeString;
  metadata?: Record<string, unknown>;
}

export interface CompetitionEvent {
  id?: string;
  competitionId?: string;
  externalIds: SourceIdentifier[];
  name: string;
  discipline?: CompetitionDiscipline;
  classCode?: string;
  section?: string;
  level?: string;
  startTime?: ISODateTimeString;
  status?: CompetitionStatus;
  metadata?: Record<string, unknown>;
}

export interface Horse {
  id?: string;
  externalIds: SourceIdentifier[];
  name: string;
  countryCode?: string;
  feiId?: string;
  nationalId?: string;
  yearOfBirth?: number;
  sex?: string;
  breed?: string;
  sire?: string;
  dam?: string;
  ownerName?: string;
  metadata?: Record<string, unknown>;
}

export interface Rider {
  id?: string;
  externalIds: SourceIdentifier[];
  displayName: string;
  givenName?: string;
  familyName?: string;
  countryCode?: string;
  feiId?: string;
  nationalId?: string;
  dateOfBirth?: ISODateString;
  metadata?: Record<string, unknown>;
}

export interface CompetitionResult {
  id?: string;
  externalIds: SourceIdentifier[];
  competitionExternalId?: SourceIdentifier;
  eventExternalId?: SourceIdentifier;
  horseExternalId?: SourceIdentifier;
  riderExternalId?: SourceIdentifier;
  horseName?: string;
  riderName?: string;
  placing?: number;
  score?: number;
  faults?: number;
  time?: string;
  status: ResultStatus;
  startNumber?: string;
  prizeMoney?: number;
  resultDate?: ISODateString;
  metadata?: Record<string, unknown>;
}

export interface EntryListItem {
  externalIds: SourceIdentifier[];
  competitionExternalId?: SourceIdentifier;
  eventExternalId?: SourceIdentifier;
  horseExternalId?: SourceIdentifier;
  riderExternalId?: SourceIdentifier;
  horseName?: string;
  riderName?: string;
  startNumber?: string;
  status?: "entered" | "accepted" | "waitlisted" | "scratched" | "unknown";
  metadata?: Record<string, unknown>;
}

export interface RankingRecord {
  externalIds: SourceIdentifier[];
  sourceRankingName: string;
  rank: number;
  athleteExternalId?: SourceIdentifier;
  horseExternalId?: SourceIdentifier;
  riderName?: string;
  horseName?: string;
  countryCode?: string;
  points?: number;
  rankingDate?: ISODateString;
  metadata?: Record<string, unknown>;
}

export interface NormalizedCompetitionGraph {
  competition: Competition;
  events: CompetitionEvent[];
  horses: Horse[];
  riders: Rider[];
  results: CompetitionResult[];
  entries: EntryListItem[];
  rankings: RankingRecord[];
  provenance: ProvenanceRecord[];
  issues: DataQualityIssue[];
}

export interface RawCompetitionPayload<TData = unknown> {
  source: DataSource;
  connectorId: string;
  fetchedAt: ISODateTimeString;
  data: TData;
  contentType?: string;
  sourceUrl?: string;
  rawRecordId?: string;
  checksum?: string;
}

export interface DiscoveryItem {
  id: string;
  connectorId: string;
  source: DataSource;
  url?: string;
  label?: string;
  countryCode?: string;
  discipline?: CompetitionDiscipline;
  freshness?: DataFreshness;
  earliestDate?: ISODateString;
  latestDate?: ISODateString;
  metadata?: Record<string, unknown>;
}

export interface ManualEntrySubmission {
  submittedByUserId?: string;
  submittedAt: ISODateTimeString;
  reason: "unsupported_event" | "historical_record" | "training_competition" | "club_event" | "pony_club" | "correction" | "private_note" | "no_reliable_public_source";
  sourceNote?: string;
  competition: Competition;
  events?: CompetitionEvent[];
  horses?: Horse[];
  riders?: Rider[];
  results?: CompetitionResult[];
  entries?: EntryListItem[];
  rankings?: RankingRecord[];
}

export interface EntityCandidate<TEntity> {
  entity: TEntity;
  externalIds?: SourceIdentifier[];
}

export interface EntityResolution<TEntity> {
  action: ResolutionAction;
  score: number;
  reason: string;
  incoming: TEntity;
  match?: TEntity;
}

export interface ReconciliationPlan {
  competition: EntityResolution<Competition>;
  events: EntityResolution<CompetitionEvent>[];
  horses: EntityResolution<Horse>[];
  riders: EntityResolution<Rider>[];
  results: EntityResolution<CompetitionResult>[];
  entries: EntityResolution<EntryListItem>[];
  rankings: EntityResolution<RankingRecord>[];
  issues: DataQualityIssue[];
  provenance: ProvenanceRecord[];
}

export interface IngestionRunSummary {
  connectorIds: string[];
  discovered: number;
  payloads: number;
  graphs: number;
  plans: number;
  created: number;
  updated: number;
  review: number;
  ignored: number;
  issues: DataQualityIssue[];
}
