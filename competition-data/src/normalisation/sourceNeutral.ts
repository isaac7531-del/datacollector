import { z } from "zod";
import type {
  Competition,
  CompetitionEvent,
  CompetitionResult,
  DataQualityIssue,
  DataSource,
  EntryListItem,
  Horse,
  NormalizedCompetitionGraph,
  RankingRecord,
  Rider,
  SourceIdentifier
} from "../domain/types";
import type { EventingPhaseResult } from "../domain/records";

const sourceIdentifierSchema = z.object({
  sourceSystem: z.string().min(1),
  sourceId: z.string().min(1),
  sourceUrl: z.string().url().optional()
});

export const sourceNeutralImportSchema = z.object({
  schemaVersion: z.literal("1.0"),
  source: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.string().min(1),
    mode: z.string().min(1),
    countryCode: z.string().optional(),
    official: z.boolean().default(false),
    sourceUrl: z.string().url().optional()
  }),
  competitions: z
    .array(
      z.object({
        externalIds: z.array(sourceIdentifierSchema).default([]),
        name: z.string().min(1),
        status: z.string().default("unknown"),
        discipline: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        countryCode: z.string().optional(),
        venue: z.string().optional(),
        organiser: z.string().optional(),
        classes: z.array(z.record(z.string(), z.unknown())).default([]),
        horses: z.array(z.record(z.string(), z.unknown())).default([]),
        riders: z.array(z.record(z.string(), z.unknown())).default([]),
        entries: z.array(z.record(z.string(), z.unknown())).default([]),
        results: z.array(z.record(z.string(), z.unknown())).default([]),
        rankings: z.array(z.record(z.string(), z.unknown())).default([])
      })
    )
    .min(1)
});

export type SourceNeutralImportDocument = z.infer<typeof sourceNeutralImportSchema>;

export interface TableColumnMapping {
  competitionName?: string;
  competitionId?: string;
  eventName?: string;
  eventId?: string;
  className?: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
  countryCode?: string;
  venue?: string;
  organiser?: string;
  discipline?: string;
  horseName?: string;
  horseId?: string;
  horseFeiId?: string;
  horseNationalId?: string;
  horseYearOfBirth?: string;
  horseSex?: string;
  horseBreed?: string;
  riderName?: string;
  riderId?: string;
  riderFeiId?: string;
  riderNationalId?: string;
  riderCountryCode?: string;
  startNumber?: string;
  placing?: string;
  score?: string;
  faults?: string;
  time?: string;
  resultStatus?: string;
  resultDate?: string;
  publicationStatus?: string;
  dressageScore?: string;
  dressagePosition?: string;
  crossCountryJumpingPenalties?: string;
  crossCountryTimePenalties?: string;
  crossCountryElapsedTime?: string;
  crossCountryOptimumTime?: string;
  crossCountryStatus?: string;
  showjumpingJumpingPenalties?: string;
  showjumpingTimePenalties?: string;
  showjumpingElapsedTime?: string;
  finalScore?: string;
  finalPlacing?: string;
  eliminationReason?: string;
  merStatus?: string;
  qualificationStatus?: string;
}

export interface TableNormalisationOptions {
  source: DataSource;
  connectorId: string;
  sourceSystem: string;
  mapping: TableColumnMapping;
  eventMetadata?: {
    competitionName?: string;
    competitionId?: string;
    countryCode?: string;
    discipline?: string;
    venue?: string;
    organiser?: string;
    startDate?: string;
    endDate?: string;
  };
  decimalFormat?: "dot" | "comma";
}

export interface TableRow {
  rowNumber: number;
  values: Record<string, string>;
  unmapped: Record<string, string>;
}

export interface NormalisationPreview {
  rows: TableRow[];
  issues: DataQualityIssue[];
}

export function normalizeSourceNeutralDocument(document: unknown, connectorId: string): NormalizedCompetitionGraph[] {
  const parsed = sourceNeutralImportSchema.safeParse(document);
  if (!parsed.success) {
    throw new Error(`Source-neutral JSON import failed validation: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }

  const source = parsed.data.source as DataSource;
  return parsed.data.competitions.map((competitionRecord, index) => {
    const competitionExternalIds = competitionRecord.externalIds.length
      ? competitionRecord.externalIds
      : [{ sourceSystem: source.id, sourceId: `competition-${index + 1}`, sourceUrl: source.sourceUrl }];

    const competition: Competition = {
      externalIds: competitionExternalIds,
      name: competitionRecord.name,
      status: competitionRecord.status as Competition["status"],
      discipline: competitionRecord.discipline as Competition["discipline"],
      startDate: competitionRecord.startDate,
      endDate: competitionRecord.endDate,
      countryCode: competitionRecord.countryCode ?? source.countryCode,
      venue: competitionRecord.venue,
      organiser: competitionRecord.organiser
    };

    return {
      competition,
      events: competitionRecord.classes.map((record, classIndex) => mapClass(record, source.id, classIndex)),
      horses: competitionRecord.horses.map((record, horseIndex) => mapHorse(record, source.id, horseIndex)),
      riders: competitionRecord.riders.map((record, riderIndex) => mapRider(record, source.id, riderIndex)),
      entries: competitionRecord.entries.map((record, entryIndex) => mapEntry(record, source.id, entryIndex)),
      results: competitionRecord.results.map((record, resultIndex) => mapResult(record, source.id, resultIndex, competitionExternalIds[0])),
      rankings: competitionRecord.rankings.map((record, rankingIndex) => mapRanking(record, source.id, rankingIndex)),
      provenance: [
        {
          source,
          connectorId,
          fetchedAt: new Date().toISOString(),
          sourceUrl: source.sourceUrl
        }
      ],
      issues: []
    };
  });
}

export function normalizeTableRows(rows: TableRow[], options: TableNormalisationOptions): NormalizedCompetitionGraph[] {
  const mapping = options.mapping;
  const issues: DataQualityIssue[] = [];
  const first = rows[0];
  const competitionName =
    value(first, mapping.competitionName) ?? options.eventMetadata?.competitionName ?? "Imported competition";
  const competitionId = value(first, mapping.competitionId) ?? options.eventMetadata?.competitionId ?? competitionName;
  const competitionExternalId = sourceId(options.sourceSystem, competitionId, options.source.sourceUrl);

  const competition: Competition = {
    externalIds: [competitionExternalId],
    name: competitionName,
    status: "completed",
    discipline: (value(first, mapping.discipline) ?? options.eventMetadata?.discipline) as Competition["discipline"],
    startDate: value(first, mapping.startDate) ?? options.eventMetadata?.startDate,
    endDate: value(first, mapping.endDate) ?? options.eventMetadata?.endDate,
    countryCode: value(first, mapping.countryCode) ?? options.eventMetadata?.countryCode ?? options.source.countryCode,
    venue: value(first, mapping.venue) ?? options.eventMetadata?.venue,
    organiser: value(first, mapping.organiser) ?? options.eventMetadata?.organiser
  };

  const events = new Map<string, CompetitionEvent>();
  const horses = new Map<string, Horse>();
  const riders = new Map<string, Rider>();
  const entries: EntryListItem[] = [];
  const results: CompetitionResult[] = [];

  for (const row of rows) {
    const rowIssues = validateMappedRow(row, mapping);
    issues.push(...rowIssues);

    const eventName = value(row, mapping.className) ?? value(row, mapping.eventName) ?? competition.name;
    const eventIdValue = value(row, mapping.classId) ?? value(row, mapping.eventId) ?? eventName;
    const eventExternalId = sourceId(options.sourceSystem, eventIdValue, options.source.sourceUrl);
    if (!events.has(eventExternalId.sourceId)) {
      events.set(eventExternalId.sourceId, {
        externalIds: [eventExternalId],
        competitionId: competition.id,
        name: eventName,
        discipline: competition.discipline,
        classCode: value(row, mapping.classId),
        level: value(row, mapping.className),
        metadata: { sourceRow: row.rowNumber }
      });
    }

    const horseName = value(row, mapping.horseName);
    const horseExternalId = sourceId(options.sourceSystem, value(row, mapping.horseId) ?? horseName ?? `row-${row.rowNumber}-horse`, options.source.sourceUrl);
    if (horseName && !horses.has(horseExternalId.sourceId)) {
      horses.set(horseExternalId.sourceId, {
        externalIds: [horseExternalId, optionalSourceId("fei", value(row, mapping.horseFeiId)), optionalSourceId("national", value(row, mapping.horseNationalId))].filter(Boolean) as SourceIdentifier[],
        name: horseName,
        feiId: value(row, mapping.horseFeiId),
        nationalId: value(row, mapping.horseNationalId),
        yearOfBirth: numberValue(row, mapping.horseYearOfBirth, options.decimalFormat),
        sex: value(row, mapping.horseSex),
        breed: value(row, mapping.horseBreed)
      });
    }

    const riderName = value(row, mapping.riderName);
    const riderExternalId = sourceId(options.sourceSystem, value(row, mapping.riderId) ?? riderName ?? `row-${row.rowNumber}-rider`, options.source.sourceUrl);
    if (riderName && !riders.has(riderExternalId.sourceId)) {
      riders.set(riderExternalId.sourceId, {
        externalIds: [riderExternalId, optionalSourceId("fei", value(row, mapping.riderFeiId)), optionalSourceId("national", value(row, mapping.riderNationalId))].filter(Boolean) as SourceIdentifier[],
        displayName: riderName,
        feiId: value(row, mapping.riderFeiId),
        nationalId: value(row, mapping.riderNationalId),
        countryCode: value(row, mapping.riderCountryCode) ?? competition.countryCode
      });
    }

    const resultExternalId = sourceId(
      options.sourceSystem,
      [competitionId, eventIdValue, value(row, mapping.startNumber), horseExternalId.sourceId, riderExternalId.sourceId].filter(Boolean).join(":"),
      options.source.sourceUrl
    );
    const eventing = mapEventing(row, mapping, options.decimalFormat);
    const result: CompetitionResult = {
      externalIds: [resultExternalId],
      competitionExternalId,
      eventExternalId,
      horseExternalId,
      riderExternalId,
      horseName,
      riderName,
      placing: numberValue(row, mapping.placing, options.decimalFormat) ?? eventing.finalPlacing,
      score: numberValue(row, mapping.score, options.decimalFormat) ?? eventing.finalScore,
      faults: numberValue(row, mapping.faults, options.decimalFormat),
      time: value(row, mapping.time),
      status: normalizeStatus(value(row, mapping.resultStatus)),
      startNumber: value(row, mapping.startNumber),
      resultDate: value(row, mapping.resultDate) ?? competition.endDate ?? competition.startDate,
      metadata: {
        eventing,
        publicationStatus: value(row, mapping.publicationStatus) ?? eventing.publicationStatus ?? "unknown",
        unmapped: row.unmapped
      }
    };
    results.push(result);

    entries.push({
      externalIds: [sourceId(options.sourceSystem, `${resultExternalId.sourceId}:entry`, options.source.sourceUrl)],
      competitionExternalId,
      eventExternalId,
      horseExternalId,
      riderExternalId,
      horseName,
      riderName,
      startNumber: result.startNumber,
      status: result.status === "withdrawn" ? "scratched" : "accepted",
      metadata: { sourceRow: row.rowNumber }
    });
  }

  return [
    {
      competition,
      events: Array.from(events.values()),
      horses: Array.from(horses.values()),
      riders: Array.from(riders.values()),
      results,
      entries,
      rankings: [],
      provenance: [
        {
          source: options.source,
          connectorId: options.connectorId,
          fetchedAt: new Date().toISOString(),
          sourceUrl: options.source.sourceUrl
        }
      ],
      issues
    }
  ];
}

export function validateMappedRow(row: TableRow, mapping: TableColumnMapping): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  if (!value(row, mapping.horseName)) {
    issues.push({ code: "row.horse_name.missing", message: "Horse name is missing.", severity: "error", path: `rows.${row.rowNumber}.horseName` });
  }
  if (!value(row, mapping.riderName)) {
    issues.push({ code: "row.rider_name.missing", message: "Rider name is missing.", severity: "error", path: `rows.${row.rowNumber}.riderName` });
  }
  return issues;
}

function mapClass(record: Record<string, unknown>, sourceSystem: string, index: number): CompetitionEvent {
  return {
    externalIds: [sourceId(sourceSystem, stringRecordValue(record, "id") ?? `class-${index + 1}`)],
    name: stringRecordValue(record, "name") ?? `Class ${index + 1}`,
    discipline: stringRecordValue(record, "discipline") as CompetitionEvent["discipline"],
    classCode: stringRecordValue(record, "classCode"),
    level: stringRecordValue(record, "level")
  };
}

function mapHorse(record: Record<string, unknown>, sourceSystem: string, index: number): Horse {
  return {
    externalIds: [sourceId(sourceSystem, stringRecordValue(record, "id") ?? stringRecordValue(record, "name") ?? `horse-${index + 1}`)],
    name: stringRecordValue(record, "name") ?? `Horse ${index + 1}`,
    feiId: stringRecordValue(record, "feiId"),
    nationalId: stringRecordValue(record, "nationalId"),
    yearOfBirth: numberRecordValue(record, "yearOfBirth"),
    sex: stringRecordValue(record, "sex"),
    breed: stringRecordValue(record, "breed")
  };
}

function mapRider(record: Record<string, unknown>, sourceSystem: string, index: number): Rider {
  return {
    externalIds: [sourceId(sourceSystem, stringRecordValue(record, "id") ?? stringRecordValue(record, "displayName") ?? `rider-${index + 1}`)],
    displayName: stringRecordValue(record, "displayName") ?? stringRecordValue(record, "name") ?? `Rider ${index + 1}`,
    feiId: stringRecordValue(record, "feiId"),
    nationalId: stringRecordValue(record, "nationalId"),
    countryCode: stringRecordValue(record, "countryCode")
  };
}

function mapEntry(record: Record<string, unknown>, sourceSystem: string, index: number): EntryListItem {
  return {
    externalIds: [sourceId(sourceSystem, stringRecordValue(record, "id") ?? `entry-${index + 1}`)],
    horseName: stringRecordValue(record, "horseName"),
    riderName: stringRecordValue(record, "riderName"),
    startNumber: stringRecordValue(record, "startNumber"),
    status: (stringRecordValue(record, "status") as EntryListItem["status"]) ?? "unknown"
  };
}

function mapResult(record: Record<string, unknown>, sourceSystem: string, index: number, competitionExternalId?: SourceIdentifier): CompetitionResult {
  return {
    externalIds: [sourceId(sourceSystem, stringRecordValue(record, "id") ?? `result-${index + 1}`)],
    competitionExternalId,
    horseName: stringRecordValue(record, "horseName"),
    riderName: stringRecordValue(record, "riderName"),
    placing: numberRecordValue(record, "placing"),
    score: numberRecordValue(record, "score") ?? numberRecordValue(record, "finalScore"),
    status: normalizeStatus(stringRecordValue(record, "status")),
    startNumber: stringRecordValue(record, "startNumber"),
    resultDate: stringRecordValue(record, "resultDate"),
    metadata: {
      eventing: {
        finalScore: numberRecordValue(record, "finalScore"),
        finalPlacing: numberRecordValue(record, "finalPlacing"),
        eliminationReason: stringRecordValue(record, "eliminationReason"),
        publicationStatus: stringRecordValue(record, "publicationStatus")
      }
    }
  };
}

function mapRanking(record: Record<string, unknown>, sourceSystem: string, index: number): RankingRecord {
  return {
    externalIds: [sourceId(sourceSystem, stringRecordValue(record, "id") ?? `ranking-${index + 1}`)],
    sourceRankingName: stringRecordValue(record, "sourceRankingName") ?? "Imported ranking",
    rank: numberRecordValue(record, "rank") ?? index + 1,
    riderName: stringRecordValue(record, "riderName"),
    horseName: stringRecordValue(record, "horseName"),
    countryCode: stringRecordValue(record, "countryCode"),
    points: numberRecordValue(record, "points"),
    rankingDate: stringRecordValue(record, "rankingDate")
  };
}

function mapEventing(row: TableRow, mapping: TableColumnMapping, decimalFormat?: "dot" | "comma"): EventingPhaseResult {
  return {
    dressageScore: numberValue(row, mapping.dressageScore, decimalFormat),
    dressagePosition: numberValue(row, mapping.dressagePosition, decimalFormat),
    crossCountryJumpingPenalties: numberValue(row, mapping.crossCountryJumpingPenalties, decimalFormat),
    crossCountryTimePenalties: numberValue(row, mapping.crossCountryTimePenalties, decimalFormat),
    crossCountryElapsedTime: value(row, mapping.crossCountryElapsedTime),
    crossCountryOptimumTime: value(row, mapping.crossCountryOptimumTime),
    crossCountryStatus: normalizeStatus(value(row, mapping.crossCountryStatus)),
    showjumpingJumpingPenalties: numberValue(row, mapping.showjumpingJumpingPenalties, decimalFormat),
    showjumpingTimePenalties: numberValue(row, mapping.showjumpingTimePenalties, decimalFormat),
    showjumpingElapsedTime: value(row, mapping.showjumpingElapsedTime),
    finalScore: numberValue(row, mapping.finalScore, decimalFormat),
    finalPlacing: numberValue(row, mapping.finalPlacing, decimalFormat),
    completionStatus: normalizeStatus(value(row, mapping.resultStatus)),
    eliminationReason: value(row, mapping.eliminationReason),
    merStatus: value(row, mapping.merStatus) as EventingPhaseResult["merStatus"],
    qualificationStatus: value(row, mapping.qualificationStatus) as EventingPhaseResult["qualificationStatus"],
    publicationStatus: (value(row, mapping.publicationStatus) as EventingPhaseResult["publicationStatus"]) ?? "unknown"
  };
}

function value(row: TableRow | undefined, key: string | undefined): string | undefined {
  if (!row || !key) return undefined;
  const raw = row.values[key];
  return raw === undefined || raw === "" ? undefined : raw;
}

function numberValue(row: TableRow, key: string | undefined, decimalFormat?: "dot" | "comma"): number | undefined {
  const raw = value(row, key);
  if (!raw) return undefined;
  const normalized = decimalFormat === "comma" ? raw.replace(",", ".") : raw;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sourceId(sourceSystem: string, sourceIdValue: string, sourceUrl?: string): SourceIdentifier {
  return { sourceSystem, sourceId: sourceIdValue, sourceUrl };
}

function optionalSourceId(sourceSystem: string, sourceIdValue: string | undefined): SourceIdentifier | undefined {
  return sourceIdValue ? { sourceSystem, sourceId: sourceIdValue } : undefined;
}

function normalizeStatus(valueToNormalize: string | undefined): CompetitionResult["status"] {
  const normalized = valueToNormalize?.toLocaleLowerCase("en").trim();
  if (!normalized) return "unknown";
  if (["el", "elim", "eliminated"].includes(normalized)) return "eliminated";
  if (["wd", "withdrawn", "scratched"].includes(normalized)) return "withdrawn";
  if (["ret", "retired"].includes(normalized)) return "retired";
  if (["dq", "disqualified"].includes(normalized)) return "disqualified";
  if (["ns", "no_show", "no show"].includes(normalized)) return "no_show";
  return "placed";
}

function stringRecordValue(record: Record<string, unknown>, key: string): string | undefined {
  const valueToRead = record[key];
  return typeof valueToRead === "string" || typeof valueToRead === "number" ? String(valueToRead) : undefined;
}

function numberRecordValue(record: Record<string, unknown>, key: string): number | undefined {
  const valueToRead = record[key];
  if (typeof valueToRead === "number") return valueToRead;
  if (typeof valueToRead === "string" && valueToRead.trim()) {
    const parsed = Number(valueToRead);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
