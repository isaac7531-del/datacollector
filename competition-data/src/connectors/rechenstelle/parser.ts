import type { CompetitionResult, NormalizedCompetitionGraph, SourceIdentifier } from "../../domain/types";
import type { RechenstelleDiscoveredEvent, RechenstelleEventDocument, RechenstellePdfResultRow } from "./types";
import { rechenstelleSource } from "./types";

export function parseRechenstelleAgenda(html: string, agendaUrl: string): RechenstelleDiscoveredEvent {
  const headings = [...html.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)]
    .map((match) => cleanHtml(match[1] ?? ""))
    .filter(Boolean);
  const eventHeading = headings.find((heading) => /\([A-Z]{3}\)/.test(heading)) ?? headings[0] ?? "Rechenstelle event";
  const countryCode = eventHeading.match(/\(([A-Z]{3})\)/)?.[1];
  const classes = headings.filter((heading) => /\b(CCIO?|CIC|CCI|Vielseitigkeit)\b/i.test(heading));
  const dateText = cleanHtml(html).match(/(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})/)?.[0];
  const documents = parseDocumentLinks(html, agendaUrl, classes);
  const slug = new URL(agendaUrl).pathname.split("/").filter(Boolean).join("-");

  return {
    id: `rechenstelle:${slug}`,
    url: agendaUrl,
    name: eventHeading.replace(/\s*\([A-Z]{3}\)\s*/, "").trim(),
    countryCode: countryCode === "GER" ? "DE" : countryCode,
    discipline: documents.some((document) => document.label.toLowerCase().includes("cross country")) || classes.some((item) => item.includes("CCI")) ? "eventing" : "other",
    startDate: parseAgendaDate(dateText),
    endDate: parseAgendaDate(dateText, true),
    classes: Array.from(new Set(classes)),
    documents
  };
}

export function parseDocumentLinks(html: string, agendaUrl: string, classes: string[]): RechenstelleEventDocument[] {
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const documents: RechenstelleEventDocument[] = [];
  let classIndex = 0;
  for (const link of links) {
    const href = link[1] ?? "";
    if (!href.toLowerCase().includes(".pdf")) continue;
    const label = cleanHtml(link[2] ?? "");
    if (!isResultLike(label, href)) continue;
    const url = new URL(href, agendaUrl).toString();
    const classCode = href.match(/_([0-9]{3})_/)?.[1];
    const documentType = classifyDocument(label, href);
    const className = classes[classIndex] ?? classes.find((item) => classCode && item.includes(classCode));
    if (documentType === "final") classIndex += 1;
    documents.push({ url, label, documentType, className, classCode });
  }
  return documents;
}

export function parseRechenstellePdfText(text: string): RechenstellePdfResultRow[] {
  const normalized = text.replace(/\s+/g, " ");
  const rows: RechenstellePdfResultRow[] = [];
  const rowPattern = /(?:^|\s)(\d{1,4})\s+([A-ZÄÖÜ0-9][A-Za-zÀ-ÖØ-öø-ÿ0-9 .'’\-]{4,120}?)\s+\(([A-Z]{3})\)\s+(.{0,120}?)(?=\s\d{1,4}\s+[A-ZÄÖÜ0-9]|\s\d+\s+Competitors|\sTechnical Delegate|$)/g;
  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(normalized))) {
    const names = splitHorseAndRider(match[2] ?? "");
    const tail = match[4] ?? "";
    const status = parseStatus(tail);
    const numbers = [...tail.matchAll(/\d+[,.]?\d*/g)].map((number) => parseNumber(number[0])).filter((value): value is number => value !== undefined);
    const placing = status === "placed" ? numbers.find((number) => Number.isInteger(number) && number > 0 && number < 200) : undefined;
    const finalScore = numbers.find((number) => number >= 15 && number < 300);
    rows.push({
      startNumber: match[1] ?? "",
      horseName: names.horseName,
      riderName: names.riderName,
      nation: match[3],
      placing,
      finalScore,
      status,
      extractionConfidence: finalScore ? "medium" : "low",
      rawText: `${match[0]}`.trim()
    });
  }
  return dedupeRows(rows);
}

function splitHorseAndRider(value: string): { horseName: string; riderName: string } {
  const tokens = cleanName(value).split(/\s+/);
  let surnameIndex = -1;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index] ?? "";
    if (/^[A-ZÄÖÜ][A-ZÄÖÜ'’\-]+$/.test(token) && token.length > 1) {
      surnameIndex = index;
      break;
    }
  }
  if (surnameIndex > 0) {
    const firstNameIndex = Math.max(1, surnameIndex - 1);
    return {
      horseName: tokens.slice(0, firstNameIndex).join(" "),
      riderName: tokens.slice(firstNameIndex).join(" ")
    };
  }
  return {
    horseName: tokens.slice(0, -2).join(" ") || tokens[0] || "",
    riderName: tokens.slice(-2).join(" ")
  };
}

export function normalizeRechenstelleDocument(event: RechenstelleDiscoveredEvent, document: RechenstelleEventDocument, rows: RechenstellePdfResultRow[]): NormalizedCompetitionGraph {
  const competitionExternalId = sourceId(`event:${event.id}`, event.url);
  const eventExternalId = sourceId(`class:${document.classCode ?? document.className ?? document.url}`, document.url);
  const competition = {
    externalIds: [competitionExternalId],
    name: event.name,
    status: document.documentType === "final" ? "completed" as const : "in_progress" as const,
    discipline: "eventing" as const,
    startDate: event.startDate,
    endDate: event.endDate,
    countryCode: event.countryCode,
    venue: event.name,
    organiser: "Rechenstelle",
    metadata: { sourceUrl: event.url }
  };
  const competitionEvent = {
    externalIds: [eventExternalId],
    competitionExternalId,
    name: document.className ?? document.label,
    discipline: "eventing" as const,
    classCode: document.classCode,
    status: competition.status,
    metadata: { documentType: document.documentType, sourceUrl: document.url }
  };
  const horses = rows.map((row) => ({
    externalIds: [sourceId(`horse:${row.horseName}`, document.url)],
    name: row.horseName,
    countryCode: row.nation
  }));
  const riders = rows.map((row) => ({
    externalIds: [sourceId(`rider:${row.riderName}:${row.nation ?? ""}`, document.url)],
    displayName: row.riderName,
    countryCode: row.nation
  }));
  const results: CompetitionResult[] = rows.map((row) => ({
    externalIds: [sourceId(`result:${event.id}:${document.classCode ?? document.label}:${row.startNumber}:${row.horseName}:${row.riderName}`, document.url)],
    competitionExternalId,
    eventExternalId,
    horseExternalId: sourceId(`horse:${row.horseName}`, document.url),
    riderExternalId: sourceId(`rider:${row.riderName}:${row.nation ?? ""}`, document.url),
    horseName: row.horseName,
    riderName: row.riderName,
    placing: row.placing,
    score: row.finalScore,
    status: row.status,
    startNumber: row.startNumber,
    resultDate: event.endDate ?? event.startDate,
    metadata: {
      eventing: {
        dressageScore: row.dressageScore,
        dressagePosition: row.dressageRank,
        crossCountryJumpingPenalties: row.crossCountryJumpingPenalties,
        crossCountryTimePenalties: row.crossCountryTimePenalties,
        crossCountryElapsedTime: row.crossCountryElapsedTime,
        showjumpingJumpingPenalties: row.showjumpingJumpingPenalties,
        showjumpingTimePenalties: row.showjumpingTimePenalties,
        finalScore: row.finalScore,
        finalPlacing: row.placing,
        publicationStatus: document.documentType === "final" ? "final" : "provisional"
      },
      extractionConfidence: row.extractionConfidence,
      sourceDocumentUrl: document.url,
      rawText: row.rawText
    }
  }));

  return {
    competition,
    events: [competitionEvent],
    horses: dedupeBy(horses, (horse) => horse.name),
    riders: dedupeBy(riders, (rider) => rider.displayName),
    entries: results.map((result) => ({
      externalIds: [sourceId(`entry:${result.externalIds[0]?.sourceId}`, document.url)],
      competitionExternalId,
      eventExternalId,
      horseExternalId: result.horseExternalId,
      riderExternalId: result.riderExternalId,
      horseName: result.horseName,
      riderName: result.riderName,
      startNumber: result.startNumber,
      status: result.status === "withdrawn" ? "scratched" as const : "accepted" as const
    })),
    results,
    rankings: [],
    provenance: [
      {
        source: rechenstelleSource,
        connectorId: "rechenstelle",
        fetchedAt: new Date().toISOString(),
        sourceUrl: document.url,
        rawRecordId: document.url
      }
    ],
    issues: rows.some((row) => row.extractionConfidence === "low")
      ? [{ code: "rechenstelle.pdf.low_confidence", message: "One or more PDF rows had low extraction confidence.", severity: "warning" as const, path: document.url }]
      : []
  };
}

function isResultLike(label: string, href: string): boolean {
  return /result|starting order|fence report/i.test(label) || /er(dre|spr|gel)|sl(dre|spr|gel)|fence/i.test(href);
}

function classifyDocument(label: string, href: string): RechenstelleEventDocument["documentType"] {
  const value = `${label} ${href}`.toLowerCase();
  if (value.includes("fence")) return "fence_report";
  if (value.includes("starting order") || value.includes("_sl")) return "start_list";
  if (value.includes("final") || value.includes("ergelges") || value.includes("ersprges")) return "final";
  if (value.includes("show jumping") || value.includes("ersprtp")) return "intermediate";
  if (value.includes("dressage") || value.includes("erdre")) return "dressage";
  return "other";
}

function cleanHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function parseAgendaDate(value: string | undefined, end = false): string | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})/);
  if (!match) return undefined;
  const month = new Date(`${match[3]} 1, ${match[4]}`).getUTCMonth() + 1;
  const day = Number(end ? match[2] : match[1]);
  return `${match[4]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseStatus(value: string): RechenstellePdfResultRow["status"] {
  const lower = value.toLowerCase();
  if (lower.includes("withdrawn")) return "withdrawn";
  if (lower.includes("retired")) return "retired";
  if (lower.includes("eliminated") || /\bBD\b|\bFR\b|\bMF\b/.test(value)) return "eliminated";
  return "placed";
}

function parseNumber(value: string): number | undefined {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\s+(Prize|Total|Dressage)$/i, "").trim();
}

function sourceId(sourceIdValue: string, sourceUrl?: string): SourceIdentifier {
  return { sourceSystem: "rechenstelle", sourceId: sourceIdValue, sourceUrl };
}

function dedupeRows(rows: RechenstellePdfResultRow[]): RechenstellePdfResultRow[] {
  return dedupeBy(rows, (row) => `${row.startNumber}:${row.horseName}:${row.riderName}`);
}

function dedupeBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const value of values) {
    const itemKey = key(value);
    if (seen.has(itemKey)) continue;
    seen.add(itemKey);
    output.push(value);
  }
  return output;
}
