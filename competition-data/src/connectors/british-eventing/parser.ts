import type { CompetitionResult, NormalizedCompetitionGraph, SourceIdentifier } from "../../domain/types";

export interface BritishEventingEvent {
  id: string;
  url: string;
  name: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  classes: BritishEventingClassChunk[];
  historicalUrls: string[];
}

export interface BritishEventingClassChunk {
  entityId: string;
  chunkId: string;
  definitionId: string;
  className: string;
  loaderUrl: string;
}

export interface BritishEventingEventLink {
  eventUrl: string;
  fixtureUrl?: string;
  eventId: string;
  title?: string;
  location?: string;
  classes?: string[];
  status?: "results_available" | "schedule_available" | "entries_open" | "cancelled" | "unknown";
}

export interface BritishEventingRow {
  position?: number;
  status: "placed" | "eliminated" | "withdrawn" | "retired" | "disqualified" | "no_show" | "unknown";
  horseName: string;
  riderName: string;
  points?: number;
  foundationPoints?: number;
  dressageScore?: number;
  showjumpingPenalties?: number;
  showjumpingTimePenalties?: number;
  crossCountryJumpingPenalties?: number;
  crossCountryTimePenalties?: number;
  finalScore?: number;
  raw: Record<string, string>;
}

export function parseBritishEventingEventPage(html: string, pageUrl: string): BritishEventingEvent {
  const title = clean(html.match(/<meta property="og:title" content="Results:\s*([^"]+)"/i)?.[1] ?? html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "British Eventing event");
  const eventId = pageUrl.match(/~([^/?#]+)/)?.[1] ?? title;
  const pageText = clean(html);
  const metadataMatch = pageText.match(/Name:\s*(.*?)\s+Date:\s*(.*?)\s+Location:\s*(.*?)\s+Class:/i);
  const dateText = metadataMatch?.[2];
  const location = metadataMatch?.[3]?.replace(/\s+Select a different year.*$/i, "").trim();
  const classes = [...html.matchAll(/<article class="load-results-table[^>]+data-entity_id="([^"]+)"[^>]+data-chunk_id="([^"]+)"[^>]+data-definition_id="([^"]+)"[\s\S]*?<h3>"?([^"<]+)"?\s+loading/gi)].map((match) => ({
    entityId: match[1] ?? "",
    chunkId: match[2] ?? "",
    definitionId: match[3] ?? "",
    className: clean(match[4] ?? ""),
    loaderUrl: new URL(`/results-table-loader/${match[1]}/${match[2]}/${match[3]}`, pageUrl).toString()
  }));
  const historicalUrls = [...html.matchAll(/href="([^"]*\/results\/event\/[^"]+)"/gi)].map((match) => new URL(match[1] ?? "", pageUrl).toString());
  return {
    id: `british-eventing:${eventId}`,
    url: pageUrl,
    name: title,
    ...parseDateRange(dateText),
    venue: location,
    classes,
    historicalUrls: Array.from(new Set(historicalUrls))
  };
}

export function parseBritishEventingEventLinks(html: string, pageUrl: string): BritishEventingEventLink[] {
  const links = new Map<string, BritishEventingEventLink>();
  for (const rowMatch of html.matchAll(/<tr([^>]*)>([\s\S]*?)<\/tr>/gi)) {
    const attrs = rowMatch[1] ?? "";
    const row = rowMatch[2] ?? "";
    const resultHref = row.match(/href=["']([^"']*\/results\/event\/[^"']+)["']/i)?.[1];
    const fixtureHref = row.match(/href=["']([^"']*\/compete\/fixtures-and-results\/[^"']+)["']/i)?.[1];
    const href = resultHref ?? fixtureHref;
    if (!href) continue;
    const eventUrl = resultHref ? new URL(resultHref, pageUrl).toString() : new URL((fixtureHref ?? "").replace("/compete/fixtures-and-results/", "/results/event/"), pageUrl).toString();
    const eventId = eventUrl.match(/~([^/?#]+)/)?.[1] ?? eventUrl;
    links.set(eventUrl, {
      eventUrl,
      fixtureUrl: fixtureHref ? new URL(fixtureHref, pageUrl).toString() : undefined,
      eventId,
      title: attr(attrs, "data-title") ?? clean(row.match(/<td>\s*<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? ""),
      location: attr(attrs, "data-location"),
      classes: (attr(attrs, "data-classes") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      status: classifyEventStatus(row)
    });
  }

  for (const match of html.matchAll(/href=["']([^"']*\/results\/event\/[^"']+)["']/gi)) {
    const eventUrl = new URL(match[1] ?? "", pageUrl).toString();
    if (!links.has(eventUrl)) {
      links.set(eventUrl, {
        eventUrl,
        eventId: eventUrl.match(/~([^/?#]+)/)?.[1] ?? eventUrl,
        status: "results_available"
      });
    }
  }

  return Array.from(links.values());
}

export function parseBritishEventingTablePayload(jsonText: string): { html: string; rows: BritishEventingRow[]; caption?: string } {
  const commands = JSON.parse(jsonText) as Array<{ data?: string }>;
  const html = commands.map((command) => command.data ?? "").join("\n");
  const caption = clean(html.match(/<caption>([\s\S]*?)<\/caption>/i)?.[1] ?? "");
  const headers = [...(html.match(/<thead>[\s\S]*?<\/thead>/i)?.[0] ?? "").matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((match) => clean(match[1] ?? ""));
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) => [...(match[1] ?? "").matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => clean(cell[1] ?? "")))
    .filter((cells) => cells.length);
  return {
    html,
    caption,
    rows: rows.map((cells) => mapRow(headers, cells)).filter((row) => row.horseName && row.riderName)
  };
}

export function normalizeBritishEventing(event: BritishEventingEvent, chunk: BritishEventingClassChunk, rows: BritishEventingRow[], sourceUrl: string): NormalizedCompetitionGraph {
  const competitionExternalId = sourceId(event.id, event.url);
  const eventExternalId = sourceId(`class:${chunk.chunkId}`, sourceUrl);
  const results: CompetitionResult[] = rows.map((row, index) => ({
    externalIds: [sourceId(`result:${event.id}:${chunk.chunkId}:${row.horseName}:${row.riderName}:${index + 1}`, sourceUrl)],
    competitionExternalId,
    eventExternalId,
    horseExternalId: sourceId(`horse:${row.horseName}`, sourceUrl),
    riderExternalId: sourceId(`rider:${row.riderName}`, sourceUrl),
    horseName: row.horseName,
    riderName: row.riderName,
    placing: row.position,
    score: row.finalScore,
    status: row.status,
    resultDate: event.endDate ?? event.startDate,
    metadata: {
      eventing: {
        dressageScore: row.dressageScore,
        showjumpingJumpingPenalties: row.showjumpingPenalties,
        showjumpingTimePenalties: row.showjumpingTimePenalties,
        crossCountryJumpingPenalties: row.crossCountryJumpingPenalties,
        crossCountryTimePenalties: row.crossCountryTimePenalties,
        finalScore: row.finalScore,
        finalPlacing: row.position,
        publicationStatus: "unknown"
      },
      raw: row.raw,
      sourceClassId: chunk.chunkId
    }
  }));

  return {
    competition: {
      externalIds: [competitionExternalId],
      name: event.name,
      status: "completed",
      discipline: "eventing",
      startDate: event.startDate,
      endDate: event.endDate,
      countryCode: "GB",
      venue: event.venue,
      organiser: "British Eventing",
      metadata: { sourceUrl: event.url }
    },
    events: [
      {
        externalIds: [eventExternalId],
        name: chunk.className,
        discipline: "eventing",
        classCode: chunk.chunkId,
        section: chunk.className.match(/Section\s+(.+)$/i)?.[1],
        metadata: { sourceUrl, entityId: chunk.entityId, definitionId: chunk.definitionId }
      }
    ],
    horses: dedupe(results.map((result) => ({ externalIds: [result.horseExternalId as SourceIdentifier], name: result.horseName ?? "" })), (horse) => horse.name),
    riders: dedupe(results.map((result) => ({ externalIds: [result.riderExternalId as SourceIdentifier], displayName: result.riderName ?? "", countryCode: "GB" })), (rider) => rider.displayName),
    entries: results.map((result) => ({
      externalIds: [sourceId(`entry:${result.externalIds[0]?.sourceId}`, sourceUrl)],
      competitionExternalId,
      eventExternalId,
      horseExternalId: result.horseExternalId,
      riderExternalId: result.riderExternalId,
      horseName: result.horseName,
      riderName: result.riderName,
      status: result.status === "withdrawn" ? "scratched" : "accepted"
    })),
    results,
    rankings: [],
    provenance: [{ source: britishEventingSource(), connectorId: "british-eventing", fetchedAt: new Date().toISOString(), sourceUrl }],
    issues: []
  };
}

function mapRow(headers: string[], cells: string[]): BritishEventingRow {
  const raw = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  const positionText = raw.POS ?? raw.Pos ?? raw.Position ?? "";
  return {
    position: parseIntValue(positionText),
    status: parseStatus(positionText || raw.Total),
    horseName: raw.Horse ?? "",
    riderName: raw.Rider ?? "",
    points: parseNumber(raw.Pts),
    foundationPoints: parseNumber(raw.FP),
    dressageScore: parseNumber(raw.D),
    showjumpingPenalties: parseNumber(raw.SJ),
    showjumpingTimePenalties: parseNumber(raw.SJT),
    crossCountryJumpingPenalties: parseNumber(raw.XC ?? raw.XCJ),
    crossCountryTimePenalties: parseNumber(raw.XCT),
    finalScore: parseNumber(raw.Total),
    raw
  };
}

function parseStatus(value: string | undefined): BritishEventingRow["status"] {
  const upper = (value ?? "").toUpperCase();
  if (upper.includes("NS")) return "no_show";
  if (upper.includes(" W") || upper === "W") return "withdrawn";
  if (upper.includes(" R") || upper === "R") return "retired";
  if (upper.includes(" D") || upper === "D") return "disqualified";
  if (upper.includes("E")) return "eliminated";
  return "placed";
}

function parseNumber(value: string | undefined): number | undefined {
  if (!value || /[A-Z]/i.test(value)) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIntValue(value: string | undefined): number | undefined {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDateRange(value: string | undefined): { startDate?: string; endDate?: string } {
  if (!value) return {};
  const cleaned = value.replace(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s*/gi, "").replace(/\s+/g, " ").trim();
  const crossMonth = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)\s*(?:-|to)\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})/i);
  if (crossMonth) {
    const year = normalizeYear(crossMonth[5]);
    return {
      startDate: formatDate(year, crossMonth[2] ?? "", Number(crossMonth[1])),
      endDate: formatDate(year, crossMonth[4] ?? "", Number(crossMonth[3]))
    };
  }
  const sameMonth = cleaned.match(/(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})/i);
  if (sameMonth) {
    const year = normalizeYear(sameMonth[4]);
    return {
      startDate: formatDate(year, sameMonth[3] ?? "", Number(sameMonth[1])),
      endDate: formatDate(year, sameMonth[3] ?? "", Number(sameMonth[2]))
    };
  }
  const single = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{2,4})/i);
  if (!single) return {};
  const year = normalizeYear(single[3]);
  return {
    startDate: formatDate(year, single[2] ?? "", Number(single[1])),
    endDate: formatDate(year, single[2] ?? "", Number(single[1]))
  };
}

function normalizeYear(value: string | undefined): string {
  if (!value) return String(new Date().getUTCFullYear());
  return value.length === 2 ? `20${value}` : value;
}

function formatDate(year: string, month: string, day: number): string {
  const monthNumber = new Date(`${month} 1, ${year}`).getUTCMonth() + 1;
  return {
    value: `${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }.value;
}

function attr(attrs: string, name: string): string | undefined {
  return attrs.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1]?.replace(/&amp;/g, "&");
}

function classifyEventStatus(rowHtml: string): BritishEventingEventLink["status"] {
  if (/status-results-available|Results Available/i.test(rowHtml)) return "results_available";
  if (/status-schedule-available|Schedule Available/i.test(rowHtml)) return "schedule_available";
  if (/entries open/i.test(rowHtml)) return "entries_open";
  if (/cancelled/i.test(rowHtml)) return "cancelled";
  return "unknown";
}

function clean(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/\s+/g, " ").trim();
}

function sourceId(id: string, sourceUrl?: string): SourceIdentifier {
  return { sourceSystem: "british-eventing", sourceId: id, sourceUrl };
}

function dedupe<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const itemKey = key(value);
    if (!itemKey || seen.has(itemKey)) return false;
    seen.add(itemKey);
    return true;
  });
}

function britishEventingSource() {
  return {
    id: "british-eventing",
    name: "British Eventing",
    kind: "national_federation" as const,
    mode: "public_page" as const,
    countryCode: "GB",
    official: true,
    sourceUrl: "https://www.britisheventing.com/"
  };
}
