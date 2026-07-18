import type { CollectionContext, CompetitionDataConnector, ConnectorDescriptor, DiscoveryContext } from "../types";
import { DisabledConnectorError } from "../types";
import type { DataSource, DiscoveryItem, RawCompetitionPayload } from "../../domain/types";
import { normalizeBritishEventing, parseBritishEventingEventLinks, parseBritishEventingEventPage, parseBritishEventingTablePayload } from "./parser";

export interface BritishEventingConnectorOptions {
  id?: string;
  enabled: boolean;
  eventUrls: string[];
  discoveryUrls?: string[];
  userAgent?: string;
}

const britishEventingSource: DataSource = {
  id: "british-eventing",
  name: "British Eventing",
  kind: "national_federation",
  mode: "public_page",
  countryCode: "GB",
  official: true,
  sourceUrl: "https://www.britisheventing.com/"
};

export function createBritishEventingConnector(options: BritishEventingConnectorOptions): CompetitionDataConnector {
  const connectorId = options.id ?? "british-eventing";
  const descriptor: ConnectorDescriptor = {
    id: connectorId,
    name: "British Eventing live connector",
    status: options.enabled ? "enabled" : "disabled",
    source: britishEventingSource,
    sourceOrganisation: "British Eventing",
    countryCode: "GB",
    disciplineCoverage: ["eventing"],
    supportedRecordTypes: ["event", "class", "entry", "result", "phase_result", "horse", "rider"],
    sourceAuthority: "official",
    collectionMethod: "page",
    acquisitionMode: options.enabled ? "server" : "disabled",
    automationLevel: options.enabled ? "fully_automated" : "unsupported",
    publicSourceUrlPattern: "https://www.britisheventing.com/results/event/{slug}~{eventId}",
    rateLimit: { requestsPerMinute: 20, concurrentRequests: 2 },
    retryPolicy: { maxAttempts: 2, initialDelayMs: 500, maxDelayMs: 5_000, backoffMultiplier: 2 },
    supportsBackfill: true,
    resultsMayBeProvisional: true,
    requiresHumanReview: false,
    sourceHealthStatus: options.enabled ? "unknown" : "disabled",
    capabilities: ["discover", "discoverEvents", "fetchEvent", "fetchClasses", "fetchEntries", "fetchResults", "checkForUpdates", "healthCheck"],
    complianceNote: "Uses ordinary server requests to public British Eventing result pages and their public results-table loader endpoint; stops on challenges."
  };

  return {
    descriptor,
    async discover(context: DiscoveryContext): Promise<DiscoveryItem[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      const urls = context.sourceIds?.length
        ? context.sourceIds
        : options.discoveryUrls?.length
          ? await discoverEventUrls(options.discoveryUrls, options.userAgent, Number(context.metadata?.maxEvents ?? 25))
          : options.eventUrls;
      const items: DiscoveryItem[] = [];
      for (const url of urls) {
        const html = await fetchText(url, options.userAgent);
        if (/captcha-delivery|cf-chl|g-recaptcha|please enable js and disable any ad blocker/i.test(html)) {
          throw new Error(`British Eventing returned a challenge for ${url}`);
        }
        const event = parseBritishEventingEventPage(html, url);
        items.push({
          id: event.id,
          connectorId,
          source: britishEventingSource,
          url,
          label: event.name,
          countryCode: "GB",
          discipline: "eventing",
          earliestDate: event.startDate,
          latestDate: event.endDate,
          metadata: { event }
        });
      }
      descriptor.lastSuccessfulDiscovery = new Date().toISOString();
      descriptor.sourceHealthStatus = "healthy";
      return items;
    },
    async collect(item: DiscoveryItem, _context: CollectionContext): Promise<RawCompetitionPayload[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      const event = (item.metadata as { event?: ReturnType<typeof parseBritishEventingEventPage> } | undefined)?.event;
      if (!event) throw new Error(`British Eventing item ${item.id} missing event metadata.`);
      const graphs = [];
      for (const chunk of event.classes) {
        const json = await fetchText(chunk.loaderUrl, options.userAgent, { "x-requested-with": "XMLHttpRequest" });
        const parsed = parseBritishEventingTablePayload(json);
        graphs.push(normalizeBritishEventing(event, chunk, parsed.rows, chunk.loaderUrl));
      }
      descriptor.lastSuccessfulCollection = new Date().toISOString();
      descriptor.sourceHealthStatus = "healthy";
      return [
        {
          connectorId,
          source: britishEventingSource,
          fetchedAt: new Date().toISOString(),
          data: graphs,
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

async function fetchText(url: string, userAgent?: string, headers: Record<string, string> = {}): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": userAgent ?? "EquiBetsCompetitionDataEngine/0.2.0 (+british-eventing)",
      ...headers
    }
  });
  if (!response.ok) throw new Error(`British Eventing fetch failed for ${url}: ${response.status}`);
  return response.text();
}

async function discoverEventUrls(discoveryUrls: string[], userAgent: string | undefined, maxEvents: number): Promise<string[]> {
  const urls: string[] = [];
  for (const discoveryUrl of discoveryUrls) {
    const html = await fetchText(discoveryUrl, userAgent);
    urls.push(...parseBritishEventingEventLinks(html, discoveryUrl).filter((event) => event.status === "results_available").map((event) => event.eventUrl));
  }
  return Array.from(new Set(urls)).slice(0, maxEvents);
}
