import type { CollectionContext, CompetitionDataConnector, ConnectorDescriptor, DiscoveryContext } from "../types";
import { DisabledConnectorError } from "../types";
import type { DataSource, DiscoveryItem, RawCompetitionPayload } from "../../domain/types";

export interface FeiPublicServerConnectorOptions {
  id?: string;
  enabled: boolean;
  urls: string[];
  userAgent?: string;
}

const feiSource: DataSource = {
  id: "fei-public",
  name: "FEI public database",
  kind: "fei",
  mode: "public_page",
  official: true,
  sourceUrl: "https://data.fei.org/"
};

export function createFeiPublicServerConnector(options: FeiPublicServerConnectorOptions): CompetitionDataConnector {
  const connectorId = options.id ?? "fei-public-server";
  const descriptor: ConnectorDescriptor = {
    id: connectorId,
    name: "FEI public server connector",
    status: options.enabled ? "enabled" : "disabled",
    source: feiSource,
    sourceOrganisation: "FEI",
    sourceAuthority: "official",
    collectionMethod: "page",
    acquisitionMode: options.enabled ? "server" : "disabled",
    automationLevel: options.enabled ? "administrator_assisted" : "unsupported",
    accessLimitation: "Ordinary server access to data.fei.org is page-specific and may return DataDome/CAPTCHA challenges. Connector stops on challenges.",
    requiredUserAction: "Use authorised FEI Web Services, FEI exports, or browser-assisted collection for restricted pages.",
    publicSourceUrlPattern: "https://data.fei.org/{clear-url}",
    rateLimit: { requestsPerMinute: 5, concurrentRequests: 1 },
    retryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1 },
    supportsBackfill: false,
    resultsMayBeProvisional: true,
    requiresHumanReview: true,
    sourceHealthStatus: options.enabled ? "unknown" : "disabled",
    capabilities: ["discover", "fetchEvent", "fetchResults", "healthCheck"],
    complianceNote: "Uses ordinary public FEI clear URLs only. Stops on DataDome/CAPTCHA/challenge responses. Does not bypass protections."
  };

  return {
    descriptor,
    async discover(context: DiscoveryContext): Promise<DiscoveryItem[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      const urls = context.sourceIds?.length ? context.sourceIds : options.urls;
      return urls.map((url, index) => ({
        id: `fei-public:${index + 1}:${url}`,
        connectorId,
        source: feiSource,
        url,
        label: url,
        metadata: { acquisitionMode: descriptor.acquisitionMode }
      }));
    },
    async collect(item: DiscoveryItem, _context: CollectionContext): Promise<RawCompetitionPayload[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      if (!item.url) throw new Error("FEI public item requires URL.");
      const response = await fetch(item.url, {
        headers: { "user-agent": options.userAgent ?? "EquiBetsCompetitionDataEngine/0.2.0 (+fei-public-clear-url)" },
        redirect: "manual"
      });
      const text = await response.text();
      if (isChallenge(text, response.status)) {
        descriptor.sourceHealthStatus = "degraded";
        descriptor.accessLimitation = `FEI returned a challenge or blocked response for ${item.url}`;
        throw new Error(descriptor.accessLimitation);
      }
      if (!response.ok) throw new Error(`FEI public fetch failed: ${response.status}`);
      descriptor.lastSuccessfulCollection = new Date().toISOString();
      descriptor.sourceHealthStatus = "healthy";
      return [
        {
          connectorId,
          source: feiSource,
          fetchedAt: new Date().toISOString(),
          data: {
            sourceUrl: item.url,
            title: text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim(),
            headings: [...text.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi)].map((match) => (match[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean),
            tablesDetected: (text.match(/<table/gi) ?? []).length,
            rawHtmlSnippet: text.slice(0, 2000)
          },
          contentType: response.headers.get("content-type") ?? "text/html",
          sourceUrl: item.url,
          rawRecordId: item.id
        }
      ];
    },
    fetchEvent(item, context) {
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
        lastSuccessAt: descriptor.lastSuccessfulCollection,
        consecutiveFailures: descriptor.sourceHealthStatus === "degraded" ? 1 : 0,
        message: descriptor.accessLimitation
      };
    }
  };
}

function isChallenge(text: string, status: number): boolean {
  return status === 403 || /captcha-delivery|DataDome|Please enable JS and disable any ad blocker|geo\.captcha-delivery\.com|g-recaptcha/i.test(text);
}
