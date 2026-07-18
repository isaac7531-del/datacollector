import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import type { DiscoveryItem, Manufacturer, NormalizedNutritionPayload, RawNutritionPayload } from "../domain/types";
import { extractPublicDocument } from "../documents/documentIngestion";
import type { AvailabilityEvidence, ManufacturerSourceConfig, OperationalConnectorTelemetry, ProductDocument } from "../operations/types";
import { extractProductLinks, parseNutrientsFromText, parseProductPage } from "../parsing/htmlProductParser";
import { fetchRobotsPolicy } from "../security/robots";
import type { ConnectorDescriptor, DiscoveryContext, OperationalManufacturerConnector } from "./types";

export interface LiveManufacturerConnectorOptions {
  config: ManufacturerSourceConfig;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export function createLiveManufacturerConnector(options: LiveManufacturerConnectorOptions): OperationalManufacturerConnector {
  const fetcher = options.fetchImpl ?? fetch;
  let telemetry: OperationalConnectorTelemetry = {
    acquisitionMode: options.config.acquisitionMode,
    supportedCountries: options.config.countriesOfficiallyDistributed,
    supportedProductCategories: options.config.productCategories,
    parseCoverage: 0,
    nutrientCoverage: 0,
    availabilityCoverage: 0,
    currentLimitation: options.config.termsNotes
  };
  const manufacturer: Manufacturer = {
    id: options.config.id,
    name: options.config.manufacturerName,
    countryCode: options.config.headquartersCountry,
    regionsSupplied: options.config.countriesOfficiallyDistributed,
    website: options.config.website,
    supportedProducts: options.config.productCategories,
    updateFrequency: `${options.config.expectedRefreshDays} days`,
    collectionMethod: options.config.collectionMethod,
    confidence: options.config.acquisitionMode === "fully_automated" ? "medium" : "low",
    sourceUrls: [...options.config.catalogueUrls, ...(options.config.sitemapUrls ?? [])],
    connectorHealth: "healthy"
  };
  const descriptor: ConnectorDescriptor = {
    id: options.config.id,
    manufacturer,
    name: `${options.config.manufacturerName} live public connector`,
    countryCode: options.config.headquartersCountry,
    regionsSupplied: options.config.countriesOfficiallyDistributed,
    website: options.config.website,
    supportedProducts: options.config.productCategories,
    updateFrequency: `${options.config.expectedRefreshDays} days`,
    collectionMethod: options.config.collectionMethod,
    productCategories: options.config.productCategories,
    version: "2.0.0",
    confidence: manufacturer.confidence,
    sourceUrls: manufacturer.sourceUrls,
    status: "enabled",
    health: "healthy"
  };

  return {
    descriptor,
    telemetry: () => telemetry,
    async discoverRegions() {
      return options.config.countriesOfficiallyDistributed;
    },
    async discoverCategories() {
      return options.config.productCategories;
    },
    async discover(context: DiscoveryContext = {}) {
      return this.discoverProducts?.(context) ?? [];
    },
    async discoverProducts(context: DiscoveryContext = {}): Promise<DiscoveryItem[]> {
      if (context.countryCode && !options.config.countriesMarketed.includes(context.countryCode)) return [];
      const discovered = new Set(options.config.fallbackProductUrls ?? []);
      for (const url of [...options.config.catalogueUrls, ...(options.config.sitemapUrls ?? [])]) {
        const urls = await discoverUrls(url, options.config.productUrlPatterns, fetcher);
        for (const productUrl of urls) {
          if (options.config.excludeProductUrlPatterns?.some((pattern) => new RegExp(pattern).test(productUrl))) continue;
          discovered.add(productUrl);
        }
      }
      telemetry = { ...telemetry, lastSuccessfulDiscovery: now(options).toISOString() };
      return Array.from(discovered).map((url) => ({
        id: createHash("sha256").update(url).digest("hex").slice(0, 24),
        connectorId: descriptor.id,
        source: {
          id: descriptor.id,
          name: descriptor.name,
          kind: descriptor.collectionMethod,
          official: true,
          countryCode: descriptor.countryCode,
          sourceUrl: url,
          robotsPolicy: "unknown"
        },
        url,
        label: url.split("/").filter(Boolean).pop(),
        countryCode: descriptor.countryCode,
        productCategory: options.config.productCategories[0],
        metadata: { acquisitionMode: options.config.acquisitionMode }
      }));
    },
    async fetch(item: DiscoveryItem) {
      return this.fetchProduct?.(item) ?? [];
    },
    async fetchProduct(item: DiscoveryItem): Promise<RawNutritionPayload[]> {
      if (!item.url) return [];
      await assertRobotsAllowed(item.url, fetcher);
      const response = await fetcher(item.url, { headers: { "user-agent": "@equibets/nutrition-data/0.1.0" } });
      if (!response.ok) throw new Error(`Unable to fetch product ${item.url}: ${response.status}`);
      const contentType = response.headers.get("content-type") ?? "";
      const data = contentType.includes("pdf") || item.url.toLowerCase().endsWith(".pdf") ? await extractPublicDocument({ url: item.url, productIds: [], fetchImpl: fetcher }) : await response.text();
      telemetry = { ...telemetry, lastSuccessfulProductFetch: now(options).toISOString() };
      return [{
        source: { ...item.source, robotsPolicy: "allowed" },
        connectorId: descriptor.id,
        fetchedAt: now(options).toISOString(),
        data,
        contentType,
        sourceUrl: item.url,
        rawRecordId: item.id,
        checksum: createHash("sha256").update(typeof data === "string" ? data : JSON.stringify(data)).digest("hex")
      }];
    },
    async fetchNutritionDocuments(item: DiscoveryItem): Promise<ProductDocument[]> {
      if (!item.url || !options.config.documentUrlPatterns?.some((pattern) => new RegExp(pattern).test(item.url ?? ""))) return [];
      return [await extractPublicDocument({ url: item.url, productIds: [], fetchImpl: fetcher })];
    },
    async fetchAvailability(item: DiscoveryItem): Promise<AvailabilityEvidence[]> {
      return options.config.countriesOfficiallyDistributed.map((country) => ({
        productId: item.id,
        country,
        evidenceType: "officially_marketed",
        sourceUrl: item.url ?? options.config.website,
        sourceName: options.config.manufacturerName,
        verifiedAt: now(options).toISOString(),
        expiresAt: addDays(now(options), 60).toISOString(),
        confidence: "medium",
        deliveryMode: "manufacturer_direct"
      }));
    },
    async fetchDistributors() {
      return [];
    },
    async normalise(payload: RawNutritionPayload): Promise<NormalizedNutritionPayload> {
      return this.parseProduct?.(payload) ?? { manufacturers: [manufacturer], products: [], provenance: [], issues: [] };
    },
    async parseProduct(payload: RawNutritionPayload): Promise<NormalizedNutritionPayload> {
      const text = typeof payload.data === "string" ? payload.data : (payload.data as ProductDocument).textExcerpt ?? "";
      const parsed = parseProductPage({
        manufacturerId: options.config.id,
        manufacturerName: options.config.manufacturerName,
        headquartersCountry: options.config.headquartersCountry,
        countriesMarketed: options.config.countriesMarketed,
        countriesOfficiallyDistributed: options.config.countriesOfficiallyDistributed,
        defaultCurrency: options.config.defaultCurrency,
        category: options.config.productCategories[0],
        sourceUrl: payload.sourceUrl ?? options.config.website,
        htmlOrText: text,
        acquisitionMode: options.config.acquisitionMode
      });
      const products = parsed.product.name ? [parsed.product] : [];
      telemetry = {
        ...telemetry,
        parseCoverage: products.length ? 1 : 0,
        nutrientCoverage: products.length ? Object.keys(parsed.product.nutrients).length / 12 : 0,
        availabilityCoverage: products.length ? 1 : 0
      };
      return {
        manufacturers: [manufacturer],
        products,
        provenance: parsed.product.provenance,
        issues: products.length && Object.keys(parsed.product.nutrients).length
          ? []
          : [{ code: "parse_low_coverage", message: `Low parse coverage for ${payload.sourceUrl}`, severity: "warning", source: payload.source }]
      };
    },
    async parseNutrients(text: string, sourceUrl: string) {
      return parseNutrientsFromText(text, sourceUrl);
    },
    async parseIngredients() {
      return [];
    },
    async parseFeedingDirections() {
      return [];
    },
    async parseWarnings(text: string) {
      return text.match(/(?:do not exceed|fresh drinking water|introduce gradually)[^.]+/gi) ?? [];
    },
    async parsePackaging(text: string) {
      return Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*(kg|g|lb|l|ml)/gi)).map((match) => ({ size: Number(match[1]), unit: match[2].toLowerCase() as "kg" | "g" | "lb" | "l" | "ml", label: match[0] }));
    },
    async determineProductState(payload: RawNutritionPayload) {
      const text = typeof payload.data === "string" ? payload.data : JSON.stringify(payload.data);
      if (/discontinued|no longer available|archived/i.test(text)) return "discontinued";
      if (/replaced by/i.test(text)) return "replaced";
      return "active";
    },
    async determineNextCheckTime() {
      return addDays(now(options), options.config.expectedRefreshDays).toISOString();
    },
    async healthCheck() {
      return {
        connectorId: descriptor.id,
        status: descriptor.status === "enabled" ? "healthy" : "disabled",
        checkedAt: now(options).toISOString(),
        consecutiveFailures: 0,
        message: telemetry.currentLimitation,
        sourceUrls: descriptor.sourceUrls,
        telemetry
      };
    }
  };
}

async function discoverUrls(url: string, patterns: string[], fetcher: typeof fetch): Promise<string[]> {
  try {
    await assertRobotsAllowed(url, fetcher);
    const response = await fetcher(url, { headers: { "user-agent": "@equibets/nutrition-data/0.1.0" } });
    if (!response.ok) return [];
    const text = await response.text();
    if (/xml|sitemap/i.test(response.headers.get("content-type") ?? "") || url.endsWith(".xml")) {
      return extractSitemapUrls(text, patterns);
    }
    return extractProductLinks(text, url, patterns);
  } catch {
    return [];
  }
}

function extractSitemapUrls(xml: string, patterns: string[]): string[] {
  const parsed = new XMLParser().parse(xml);
  const urls = new Set<string>();
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(visit);
    const record = value as Record<string, unknown>;
    if (typeof record.loc === "string" && patterns.some((pattern) => new RegExp(pattern).test(record.loc as string))) urls.add(record.loc);
    for (const child of Object.values(record)) visit(child);
  };
  visit(parsed);
  return Array.from(urls).sort();
}

async function assertRobotsAllowed(url: string, fetcher: typeof fetch): Promise<void> {
  const parsed = new URL(url);
  const policy = await fetchRobotsPolicy(parsed.origin, fetcher);
  if (!policy.allows(url)) throw new Error(`robots.txt disallows ${url}`);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function now(options: LiveManufacturerConnectorOptions): Date {
  return options.now?.() ?? new Date();
}

export function createLiveManufacturerConnectors(configs = [] as ManufacturerSourceConfig[]) {
  return configs.map((config) => createLiveManufacturerConnector({ config }));
}
