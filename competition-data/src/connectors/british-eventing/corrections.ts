import { createHash } from "crypto";
import type { BritishEventingRow } from "./parser";

export interface BritishEventingCorrection {
  key: string;
  changedFields: string[];
  previous: BritishEventingRow;
  current: BritishEventingRow;
}

export function britishEventingResultKey(row: BritishEventingRow): string {
  return `${row.horseName}|${row.riderName}`.toLowerCase();
}

export function britishEventingResultFingerprint(row: BritishEventingRow): string {
  return createHash("sha256").update(JSON.stringify({
    position: row.position,
    status: row.status,
    dressageScore: row.dressageScore,
    showjumpingPenalties: row.showjumpingPenalties,
    showjumpingTimePenalties: row.showjumpingTimePenalties,
    crossCountryJumpingPenalties: row.crossCountryJumpingPenalties,
    crossCountryTimePenalties: row.crossCountryTimePenalties,
    finalScore: row.finalScore
  })).digest("hex");
}

export function detectBritishEventingCorrections(previousRows: BritishEventingRow[], currentRows: BritishEventingRow[]): BritishEventingCorrection[] {
  const previous = new Map(previousRows.map((row) => [britishEventingResultKey(row), row]));
  const corrections: BritishEventingCorrection[] = [];
  for (const current of currentRows) {
    const prior = previous.get(britishEventingResultKey(current));
    if (!prior) continue;
    const changedFields = changedFieldsFor(prior, current);
    if (changedFields.length) {
      corrections.push({ key: britishEventingResultKey(current), changedFields, previous: prior, current });
    }
  }
  return corrections;
}

function changedFieldsFor(previous: BritishEventingRow, current: BritishEventingRow): string[] {
  const fields: Array<keyof BritishEventingRow> = [
    "position",
    "status",
    "dressageScore",
    "showjumpingPenalties",
    "showjumpingTimePenalties",
    "crossCountryJumpingPenalties",
    "crossCountryTimePenalties",
    "finalScore"
  ];
  return fields.filter((field) => previous[field] !== current[field]).map(String);
}
