import type { CompetitionDataConnector, CollectionContext, ConnectorDescriptor, DiscoveryContext } from "../types";
import { DisabledConnectorError } from "../types";
import type { DiscoveryItem, RawCompetitionPayload } from "../../domain/types";
import { fetchPdfText, fetchText } from "./fetch";
import { normalizeRechenstelleDocument, parseRechenstelleAgenda, parseRechenstellePdfText } from "./parser";
import type { RechenstelleConnectorOptions, RechenstellePayload } from "./types";
import { rechenstelleSource } from "./types";

export function createRechenstelleConnector(options: RechenstelleConnectorOptions): CompetitionDataConnector {
  const connectorId = options.id ?? "rechenstelle";
  const descriptor: ConnectorDescriptor = {
    id: connectorId,
    name: "Rechenstelle live connector",
    status: options.enabled ? "enabled" : "disabled",
    source: rechenstelleSource,
    sourceOrganisation: "Rechenstelle",
    countryCode: "DE",
    disciplineCoverage: ["eventing", "dressage", "jumping"],
    competitionLevels: ["CCI1*", "CCI2*", "CCI3*", "CCI4*", "CCI5*", "national"],
    supportedRecordTypes: ["event", "class", "entry", "result", "phase_result", "horse", "rider"],
    sourceAuthority: "official",
    collectionMethod: "file",
    acquisitionMode: options.enabled ? "server" : "disabled",
    automationLevel: options.enabled ? "fully_automated" : "unsupported",
    publicSourceUrlPattern: "https://www.rechenstelle.de/{lang}/agenda/{year}/{event}/",
    checkFrequencyMs: 60 * 60 * 1000,
    rateLimit: { requestsPerMinute: 20, concurrentRequests: 2 },
    retryPolicy: { maxAttempts: 2, initialDelayMs: 500, maxDelayMs: 5_000, backoffMultiplier: 2 },
    supportsBackfill: true,
    resultsMayBeProvisional: true,
    requiresHumanReview: false,
    sourceHealthStatus: options.enabled ? "unknown" : "disabled",
    capabilities: ["discover", "discoverEvents", "fetchEvent", "fetchClasses", "fetchEntries", "fetchResults", "checkForUpdates", "healthCheck"],
    complianceNote: "Uses ordinary server requests to public Rechenstelle agenda pages and linked public result PDFs; no authentication or bypass."
  };

  return {
    descriptor,
    async discover(context: DiscoveryContext): Promise<DiscoveryItem[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      const urls = context.sourceIds?.length ? context.sourceIds : options.agendaUrls;
      const items: DiscoveryItem[] = [];
      for (const url of urls) {
        const { text } = await fetchText(url, options.userAgent);
        const event = parseRechenstelleAgenda(text, url);
        items.push({
          id: event.id,
          connectorId,
          source: rechenstelleSource,
          url,
          label: event.name,
          countryCode: event.countryCode,
          discipline: event.discipline === "eventing" ? "eventing" : "other",
          earliestDate: event.startDate,
          latestDate: event.endDate,
          metadata: { event }
        });
      }
      descriptor.lastSuccessfulDiscovery = new Date().toISOString();
      descriptor.sourceHealthStatus = "healthy";
      return items;
    },
    async collect(item: DiscoveryItem, context: CollectionContext): Promise<RawCompetitionPayload[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      const event = (item.metadata as { event?: ReturnType<typeof parseRechenstelleAgenda> } | undefined)?.event;
      if (!event) throw new Error(`Rechenstelle discovery item ${item.id} does not include event metadata.`);
      const documents = event.documents.filter((document) => ["dressage", "intermediate", "final"].includes(document.documentType));
      const payloads: RechenstellePayload[] = [];
      for (const document of documents) {
        const pdf = await fetchPdfText(document.url, { userAgent: options.userAgent, maxBytes: options.maxPdfBytes });
        const rows = parseRechenstellePdfText(pdf.text);
        if (!rows.length && document.documentType === "final") {
          throw new Error(`No result rows parsed from ${document.url}`);
        }
        payloads.push({
          event,
          document,
          text: pdf.text,
          rows,
          graph: normalizeRechenstelleDocument(event, document, rows)
        });
      }
      descriptor.lastSuccessfulCollection = new Date().toISOString();
      descriptor.sourceHealthStatus = "healthy";
      return [
        {
          connectorId,
          source: rechenstelleSource,
          fetchedAt: new Date().toISOString(),
          data: payloads.map((payload) => payload.graph),
          contentType: "application/vnd.equibets.normalized-graph+json",
          sourceUrl: item.url,
          rawRecordId: item.id
        }
      ];
    },
    discoverEvents(context) {
      return this.discover(context);
    },
    fetchEvent(item, context) {
      return this.collect(item, context);
    },
    fetchClasses(item, context) {
      return this.collect(item, context);
    },
    fetchEntries(item, context) {
      return this.collect(item, context);
    },
    fetchResults(item, context) {
      return this.collect(item, context);
    },
    async healthCheck() {
      return {
        connectorId,
        status: descriptor.sourceHealthStatus ?? "unknown",
        checkedAt: new Date().toISOString(),
        lastSuccessAt: descriptor.lastSuccessfulCollection ?? descriptor.lastSuccessfulDiscovery,
        consecutiveFailures: 0,
        message: descriptor.accessLimitation
      };
    }
  };
}
