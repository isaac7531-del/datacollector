import type { AvailabilityRecord, FeedProduct, HorseLocation } from "../domain/types";

export interface AvailabilityDecision {
  product: FeedProduct;
  available: boolean;
  rank: number;
  reason: string;
  imported: boolean;
}

export class AvailabilityEngine {
  evaluate(product: FeedProduct, location: HorseLocation): AvailabilityDecision {
    const availability = product.availability;
    if (product.discontinued || availability.discontinued) {
      return decision(product, false, 999, "Product is discontinued.", false);
    }
    if (availability.countries.includes(location.country)) {
      if (location.stateOrProvince && availability.regions?.length && !availability.regions.includes(location.stateOrProvince)) {
        return decision(product, false, 90, `Product is sold in ${location.country}, but not verified for ${location.stateOrProvince}.`, false);
      }
      if (location.postalCode && availability.postalCodePrefixes?.length && !availability.postalCodePrefixes.some((prefix) => location.postalCode?.startsWith(prefix))) {
        return decision(product, false, 85, "Product is not verified for the supplied postal code.", false);
      }
      return decision(product, true, confidenceRank(availability), "Product is locally available for this horse location.", false);
    }
    if (location.allowImportedFeeds && availability.importAvailable) {
      return decision(product, true, 60 + confidencePenalty(availability), "Product is available only as an imported option for this location.", true);
    }
    if (location.allowGlobalSearch) {
      return decision(product, true, 80 + confidencePenalty(availability), "Product is outside the local market and shown because global search is enabled.", true);
    }
    return decision(product, false, 100, `Product is not available in ${location.country}.`, false);
  }

  filterAndRank(products: FeedProduct[], location: HorseLocation): AvailabilityDecision[] {
    return products
      .map((product) => this.evaluate(product, location))
      .filter((entry) => entry.available)
      .sort((a, b) => a.rank - b.rank || a.product.name.localeCompare(b.product.name));
  }
}

function decision(product: FeedProduct, available: boolean, rank: number, reason: string, imported: boolean): AvailabilityDecision {
  return { product, available, rank, reason, imported };
}

function confidenceRank(availability: AvailabilityRecord): number {
  if (availability.availabilityConfidence === "verified") return 10;
  if (availability.availabilityConfidence === "high") return 20;
  if (availability.availabilityConfidence === "medium") return 35;
  return 50;
}

function confidencePenalty(availability: AvailabilityRecord): number {
  if (availability.availabilityConfidence === "verified") return 0;
  if (availability.availabilityConfidence === "high") return 5;
  if (availability.availabilityConfidence === "medium") return 10;
  return 20;
}
