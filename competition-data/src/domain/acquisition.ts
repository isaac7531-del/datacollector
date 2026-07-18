import type { CompetitionDiscipline, ISODateString, ISODateTimeString } from "./types";
import type { AcquisitionMode, AutomationLevel } from "../connectors/types";

export type SourceEventState =
  | "announced"
  | "entries_open"
  | "entries_published"
  | "started"
  | "live"
  | "provisional"
  | "final"
  | "corrected"
  | "cancelled"
  | "abandoned"
  | "inaccessible";

export interface SourceEventCheckpoint {
  id: string;
  source: string;
  sourceEventId: string;
  publicUrl: string;
  eventName: string;
  venue?: string;
  countryCode?: string;
  discipline?: CompetitionDiscipline;
  startDate?: ISODateString;
  endDate?: ISODateString;
  discoveredClasses: string[];
  currentState: SourceEventState;
  lastCheckedAt?: ISODateTimeString;
  nextScheduledCheckAt?: ISODateTimeString;
  finalisedAt?: ISODateTimeString;
  correctionCheckExpiresAt?: ISODateTimeString;
  contentFingerprint?: string;
  metadata?: Record<string, unknown>;
}

export interface SourceHealthSummary {
  source: string;
  acquisitionMode: AcquisitionMode;
  automationLevel: AutomationLevel;
  discoveryHealth: "unknown" | "healthy" | "degraded" | "failing" | "disabled";
  collectionHealth: "unknown" | "healthy" | "degraded" | "failing" | "disabled";
  parsingHealth: "unknown" | "healthy" | "degraded" | "failing" | "disabled";
  lastSuccessfulRequest?: ISODateTimeString;
  lastSuccessfulEvent?: string;
  parseSuccessPercentage?: number;
  unresolvedPercentage?: number;
  sourceChangeWarning?: string;
  blockedOrChallengeCount: number;
  currentBackfillCheckpoint?: string;
  rateLimitState?: string;
  nextScheduledRun?: ISODateTimeString;
}

export interface BackfillPlan {
  id: string;
  source: string;
  fromDate: ISODateString;
  toDate: ISODateString;
  discipline?: CompetitionDiscipline;
  countryCode?: string;
  eventLevel?: string;
  concurrency: number;
  requestsPerMinute: number;
  dryRun: boolean;
  maximumRecords?: number;
  estimatedEvents?: number;
  estimatedDocuments?: number;
  estimatedStorageBytes?: number;
  status: "planned" | "running" | "paused" | "cancelled" | "completed" | "failed";
  checkpoint?: string;
}

export function determineNextCheckTime(event: Pick<SourceEventCheckpoint, "currentState" | "startDate" | "endDate">, now = new Date()): ISODateTimeString | undefined {
  const start = event.startDate ? new Date(`${event.startDate}T00:00:00.000Z`) : undefined;
  const end = event.endDate ? new Date(`${event.endDate}T23:59:59.000Z`) : start;
  const add = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

  if (event.currentState === "cancelled" || event.currentState === "abandoned" || event.currentState === "inaccessible") {
    return undefined;
  }
  if (event.currentState === "live") return add(1);
  if (event.currentState === "provisional") return add(6);
  if (event.currentState === "final" || event.currentState === "corrected") {
    if (end && now.getTime() - end.getTime() <= 7 * 24 * 60 * 60 * 1000) return add(24);
    if (end && now.getTime() - end.getTime() <= 30 * 24 * 60 * 60 * 1000) return add(7 * 24);
    return undefined;
  }
  if (start) {
    const daysUntilStart = (start.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    if (daysUntilStart > 30) return add(7 * 24);
    if (daysUntilStart > 3) return add(24);
    if (daysUntilStart >= 0) return add(6);
  }
  return add(24);
}
