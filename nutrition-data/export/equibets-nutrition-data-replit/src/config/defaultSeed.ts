import type { FeedProduct, Manufacturer, NormalizedNutritionPayload } from "../domain/types";
import { normaliseNutrientMap } from "../normalisation/nutrients";

const now = "2026-01-01T00:00:00.000Z";

export const defaultManufacturers: Manufacturer[] = [
  {
    id: "southern-cross-feeds",
    name: "Southern Cross Feeds",
    countryCode: "AU",
    regionsSupplied: ["AU-NSW", "AU-VIC", "AU-QLD", "AU-SA", "AU-WA"],
    website: "https://example.com/southern-cross-feeds",
    supportedProducts: ["balancer", "performance_feed", "senior_feed"],
    updateFrequency: "weekly",
    collectionMethod: "public_json",
    confidence: "high",
    sourceUrls: ["https://example.com/southern-cross-feeds/products.json"],
    connectorHealth: "healthy"
  },
  {
    id: "british-forage-minerals",
    name: "British Forage Minerals",
    countryCode: "GB",
    regionsSupplied: ["GB-ENG", "GB-SCT", "GB-WLS"],
    website: "https://example.com/british-forage-minerals",
    supportedProducts: ["vitamin_mineral_supplement", "hoof_supplement"],
    updateFrequency: "monthly",
    collectionMethod: "public_page",
    confidence: "medium",
    sourceUrls: ["https://example.com/british-forage-minerals/catalogue"],
    connectorHealth: "healthy"
  },
  {
    id: "global-performance-equine",
    name: "Global Performance Equine",
    countryCode: "US",
    regionsSupplied: ["US"],
    website: "https://example.com/global-performance-equine",
    supportedProducts: ["performance_feed", "electrolyte", "omega_product"],
    updateFrequency: "weekly",
    collectionMethod: "public_json",
    confidence: "medium",
    sourceUrls: ["https://example.com/global-performance-equine/feed.json"],
    connectorHealth: "healthy"
  }
];

export const defaultProducts: FeedProduct[] = [
  createProduct({
    id: "scf-low-starch-balancer",
    manufacturerId: "southern-cross-feeds",
    manufacturerName: "Southern Cross Feeds",
    name: "Low Starch Balancer",
    category: "balancer",
    countries: ["AU"],
    regions: ["AU-NSW", "AU-VIC", "AU-QLD", "AU-SA", "AU-WA"],
    price: { amount: 52, currency: "AUD", kg: 20 },
    nutrients: {
      crude_protein: 18,
      starch: 6,
      sugar: 4,
      calcium: 2.5,
      phosphorus: 1,
      copper: 160,
      zinc: 520,
      selenium: 1.2,
      vitamin_e: 1800,
      digestible_energy: 10
    }
  }),
  createProduct({
    id: "scf-endurance-oil",
    manufacturerId: "southern-cross-feeds",
    manufacturerName: "Southern Cross Feeds",
    name: "Endurance Omega Oil",
    category: "omega_product",
    countries: ["AU"],
    regions: ["AU-NSW", "AU-VIC", "AU-QLD"],
    price: { amount: 38, currency: "AUD", kg: 5 },
    nutrients: {
      fat: 99,
      omega_3: 22,
      omega_6: 14,
      digestible_energy: 34
    }
  }),
  createProduct({
    id: "bfm-hoof-mineral",
    manufacturerId: "british-forage-minerals",
    manufacturerName: "British Forage Minerals",
    name: "Forage Plus Hoof Mineral",
    category: "hoof_supplement",
    countries: ["GB"],
    regions: ["GB-ENG", "GB-SCT", "GB-WLS"],
    price: { amount: 41, currency: "GBP", kg: 10 },
    nutrients: {
      copper: 2200,
      zinc: 7000,
      biotin: 25,
      selenium: 4,
      vitamin_e: 5000
    }
  }),
  createProduct({
    id: "gpe-race-performance",
    manufacturerId: "global-performance-equine",
    manufacturerName: "Global Performance Equine",
    name: "Race Performance Mix",
    category: "racehorse_feed",
    countries: ["US"],
    regions: ["US"],
    importAvailable: true,
    price: { amount: 35, currency: "USD", kg: 22.68 },
    nutrients: {
      crude_protein: 14,
      fat: 8,
      fibre: 12,
      starch: 28,
      sugar: 7,
      calcium: 0.9,
      phosphorus: 0.6,
      digestible_energy: 13.2
    }
  })
];

export const defaultNutritionPayload: NormalizedNutritionPayload = {
  manufacturers: defaultManufacturers,
  products: defaultProducts,
  provenance: [],
  issues: []
};

function createProduct(options: {
  id: string;
  manufacturerId: string;
  manufacturerName: string;
  name: string;
  category: FeedProduct["category"];
  countries: string[];
  regions?: string[];
  importAvailable?: boolean;
  price: { amount: number; currency: string; kg: number };
  nutrients: Record<string, number>;
}): FeedProduct {
  return {
    id: options.id,
    manufacturerId: options.manufacturerId,
    manufacturerName: options.manufacturerName,
    brand: options.manufacturerName,
    name: options.name,
    category: options.category,
    suitableDisciplines: ["dressage", "eventing", "showjumping", "pleasure"],
    suitableAges: ["adult", "senior"],
    suitableWorkloads: ["maintenance", "light", "moderate", "heavy"],
    suitableHorseTypes: ["horse", "pony"],
    packaging: [{ size: options.price.kg, unit: "kg", label: `${options.price.kg} kg bag` }],
    prices: [
      {
        amount: options.price.amount,
        currency: options.price.currency,
        packageSize: { size: options.price.kg, unit: "kg" },
        confidence: "medium"
      }
    ],
    availability: {
      countries: options.countries,
      regions: options.regions,
      importAvailable: options.importAvailable ?? false,
      availabilityConfidence: "high",
      lastVerifiedAt: now
    },
    nutrients: normaliseNutrientMap(options.nutrients),
    ingredients: [],
    warnings: [],
    images: [],
    versionHistory: [{ version: "1", changedAt: now, changeType: "created", summary: "Seed product created." }],
    sourceUrls: [`https://example.com/products/${options.id}`],
    provenance: [],
    confidence: "medium",
    lastUpdatedAt: now
  };
}
