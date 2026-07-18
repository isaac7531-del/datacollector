import type { CurrencyCode, MoneyAmount } from "../domain/types";
import type { PriceObservation } from "../operations/types";

export interface PriceVersion {
  id: string;
  productId: string;
  country: string;
  region?: string;
  retailer?: string;
  capturedAt: string;
  amount: number;
  currency: CurrencyCode;
  packageSize: string;
  sourceUrl: string;
  confidence: PriceObservation["confidence"];
}

export interface PriceTrendSummary {
  productId: string;
  country?: string;
  currency?: CurrencyCode;
  versions: PriceVersion[];
  firstPrice?: MoneyAmount;
  latestPrice?: MoneyAmount;
  absoluteChange?: MoneyAmount;
  percentageChange?: number;
  averageMonthlyFeedCost?: MoneyAmount;
  cheapestRegion?: { country: string; region?: string; amount: MoneyAmount };
  seasonalAverages: Record<string, MoneyAmount>;
}

export function priceObservationToVersion(observation: PriceObservation): PriceVersion {
  return {
    id: `${observation.productId}:${observation.country}:${observation.capturedAt}:${observation.amount}`,
    productId: observation.productId,
    country: observation.country,
    retailer: observation.retailer,
    capturedAt: observation.capturedAt,
    amount: observation.amount,
    currency: observation.currency,
    packageSize: observation.packageSize,
    sourceUrl: observation.sourceUrl,
    confidence: observation.confidence
  };
}

export class PriceHistoryEngine {
  summarise(observations: PriceObservation[], options: { productId?: string; country?: string; dailyPackageFraction?: number } = {}): PriceTrendSummary {
    const filtered = observations
      .filter((observation) => !options.productId || observation.productId === options.productId)
      .filter((observation) => !options.country || observation.country === options.country)
      .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    const versions = filtered.map(priceObservationToVersion);
    const first = versions[0];
    const latest = versions[versions.length - 1];
    const currency = latest?.currency ?? first?.currency;
    const absolute = first && latest ? round(latest.amount - first.amount, 2) : undefined;
    const cheapest = cheapestRegion(versions);
    return {
      productId: options.productId ?? latest?.productId ?? first?.productId ?? "unknown",
      country: options.country,
      currency,
      versions,
      firstPrice: first ? money(first.amount, first.currency) : undefined,
      latestPrice: latest ? money(latest.amount, latest.currency) : undefined,
      absoluteChange: absolute !== undefined && currency ? money(absolute, currency) : undefined,
      percentageChange: first && latest && first.amount ? round(((latest.amount - first.amount) / first.amount) * 100, 2) : undefined,
      averageMonthlyFeedCost: latest && options.dailyPackageFraction ? money(latest.amount * options.dailyPackageFraction * 30.4375, latest.currency) : undefined,
      cheapestRegion: cheapest,
      seasonalAverages: seasonalAverages(versions)
    };
  }
}

function cheapestRegion(versions: PriceVersion[]): PriceTrendSummary["cheapestRegion"] {
  if (!versions.length) return undefined;
  const cheapest = [...versions].sort((a, b) => a.amount - b.amount)[0];
  return { country: cheapest.country, region: cheapest.region, amount: money(cheapest.amount, cheapest.currency) };
}

function seasonalAverages(versions: PriceVersion[]): Record<string, MoneyAmount> {
  const groups = new Map<string, PriceVersion[]>();
  for (const version of versions) {
    const season = seasonFor(new Date(version.capturedAt).getUTCMonth());
    groups.set(season, [...(groups.get(season) ?? []), version]);
  }
  return Object.fromEntries(Array.from(groups.entries()).map(([season, values]) => {
    const currency = values[0].currency;
    const average = values.reduce((sum, value) => sum + value.amount, 0) / values.length;
    return [season, money(average, currency)];
  }));
}

function seasonFor(month: number): "winter" | "spring" | "summer" | "autumn" {
  if (month === 11 || month <= 1) return "winter";
  if (month <= 4) return "spring";
  if (month <= 7) return "summer";
  return "autumn";
}

function money(amount: number, currency: CurrencyCode): MoneyAmount {
  return { amount: round(amount, 2), currency };
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
