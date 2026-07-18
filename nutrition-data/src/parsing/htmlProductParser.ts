import type { CollectionMethod, FeedProduct, NutrientMap, PackagingOption, ProductCategory } from "../domain/types";
import { parseFeedingRules } from "../feeding/feedingDirections";
import { buildProductIdentityKey } from "../identity/productIdentity";
import { parseIngredientList } from "../normalisation/ingredients";
import { nutrientFactToValue, parseNutrientDeclaration } from "../normalisation/unitNormalisation";
import type { AcquisitionMode, AvailabilityEvidence, ConfidenceBreakdown, FeedingRule, IngredientFact, ProductClaim } from "../operations/types";
import { extractProductClaims } from "../normalisation/ingredients";

export interface ParsedProductPage {
  product: FeedProduct;
  nutrientsExtracted: number;
  ingredients: IngredientFact[];
  feedingRules: FeedingRule[];
  claims: ProductClaim[];
  confidence: ConfidenceBreakdown;
}

export interface ParseProductPageOptions {
  manufacturerId: string;
  manufacturerName: string;
  headquartersCountry: string;
  countriesMarketed: string[];
  countriesOfficiallyDistributed: string[];
  defaultCurrency?: string;
  category: ProductCategory;
  sourceUrl: string;
  htmlOrText: string;
  acquisitionMode: AcquisitionMode;
}

const NUTRIENT_LINE =
  /([A-Za-zÀ-ÿ0-9 &().+\-/]+?)\s*(?:=|:|\s{2,}|\|)\s*([<>]?\s*\d[\d,.]*(?:\s*(?:%|ppm|g\/kg|mg\/kg|mcg\/kg|ug\/kg|iu\/kg|i\.u\/kg|iu\/lb\.?|mg\/lb\.?|MJ\/kg|Mcal\/lb|MJ|g|mg|mcg|ug|iu))?)/gi;

export function parseProductPage(options: ParseProductPageOptions): ParsedProductPage {
  const text = htmlToText(options.htmlOrText);
  const name = extractTitle(text, options.sourceUrl);
  const nutrients = parseNutrientsFromText(text, options.sourceUrl);
  const ingredients = parseIngredientList(text, options.sourceUrl);
  const feedingRules = parseFeedingRules(text, productIdFor(options, name), options.sourceUrl);
  const claims = extractProductClaims(text, options.sourceUrl);
  const packaging = parsePackagingFromText(text);
  const warnings = parseWarningsFromText(text);
  const productId = productIdFor(options, name);
  const now = new Date().toISOString();
  const source = {
    id: options.manufacturerId,
    name: options.manufacturerName,
    kind: (options.acquisitionMode === "document_assisted" ? "public_pdf" : "public_page") as CollectionMethod,
    official: true,
    countryCode: options.headquartersCountry,
    sourceUrl: options.sourceUrl,
    robotsPolicy: "allowed" as const
  };
  const availabilityEvidence: AvailabilityEvidence[] = options.countriesOfficiallyDistributed.map((country) => ({
    productId,
    country,
    evidenceType: "officially_marketed",
    sourceUrl: options.sourceUrl,
    sourceName: options.manufacturerName,
    verifiedAt: now,
    expiresAt: addDays(now, 60),
    confidence: "medium",
    deliveryMode: "manufacturer_direct"
  }));

  const product: FeedProduct = {
    id: productId,
    manufacturerId: options.manufacturerId,
    manufacturerName: options.manufacturerName,
    brand: options.manufacturerName,
    name,
    category: options.category,
    suitableDisciplines: [],
    suitableAges: [],
    suitableWorkloads: [],
    suitableHorseTypes: [],
    packaging,
    prices: [],
    availability: {
      countries: options.countriesOfficiallyDistributed,
      availabilityConfidence: availabilityEvidence.length ? "medium" : "low",
      lastVerifiedAt: now,
      source
    },
    nutrients,
    ingredients: ingredients.map((ingredient) => ({
      name: ingredient.canonicalName,
      order: ingredient.order,
      percentage: ingredient.percentage,
      notes: ingredient.originalName
    })),
    feedingDirections: extractFeedingText(text),
    warnings,
    images: [],
    versionHistory: [{ version: "1", changedAt: now, changeType: "created", summary: "Collected from public manufacturer product page.", sourceUrl: options.sourceUrl }],
    sourceUrls: [options.sourceUrl],
    provenance: [
      {
        source,
        connectorId: options.manufacturerId,
        fetchedAt: now,
        sourceUrl: options.sourceUrl,
        fieldPath: "product",
        confidence: "high"
      }
    ],
    confidence: confidenceFor(nutrients, feedingRules, ingredients),
    lastUpdatedAt: now,
    metadata: {
      acquisitionMode: options.acquisitionMode,
      availabilityEvidence,
      feedingRules,
      claims,
      confidence: confidenceBreakdown(nutrients, feedingRules, ingredients, availabilityEvidence.length)
    }
  };

  return {
    product,
    nutrientsExtracted: Object.keys(nutrients).length,
    ingredients,
    feedingRules,
    claims,
    confidence: product.metadata?.confidence as ConfidenceBreakdown
  };
}

export function parseNutrientsFromText(textOrHtml: string, sourceUrl: string): NutrientMap {
  const text = htmlToText(textOrHtml);
  const nutrients: NutrientMap = {};
  for (const match of text.matchAll(NUTRIENT_LINE)) {
    const label = cleanLabel(match[1]);
    const rawValue = match[2];
    if (!looksLikeNutrient(label)) continue;
    const fact = parseNutrientDeclaration(label, rawValue, sourceUrl, match[0]);
    if (!fact) continue;
    nutrients[fact.canonicalKey] = nutrientFactToValue(fact);
  }
  for (const line of text.split(/\n/)) {
    const clean = line.trim();
    if (!looksLikeNutrient(clean)) continue;
    const match = clean.match(/^(.{3,80}?)\s+([<>]?\s*\d[\d,.]*(?:\s*(?:%|ppm|g\/kg|mg\/kg|mcg\/kg|ug\/kg|iu\/kg|i\.u\/kg|iu\/lb\.?|mg\/lb\.?|MJ\/kg|Mcal\/lb|MJ|g|mg|mcg|ug|iu))?)$/i);
    if (!match) continue;
    const fact = parseNutrientDeclaration(cleanLabel(match[1]), match[2], sourceUrl, clean);
    if (!fact) continue;
    nutrients[fact.canonicalKey] = nutrientFactToValue(fact);
  }
  return nutrients;
}

export function extractProductLinks(html: string, baseUrl: string, patterns: string[]): string[] {
  const links = new Set<string>();
  const regex = /href=["']([^"']+)["']/gi;
  for (const match of html.matchAll(regex)) {
    try {
      const url = new URL(match[1], baseUrl).toString().replace(/#.*$/, "");
      if (patterns.some((pattern) => new RegExp(pattern).test(url))) links.add(url);
    } catch {
      continue;
    }
  }
  return Array.from(links).sort();
}

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h1|h2|h3|h4|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function productIdFor(options: ParseProductPageOptions, name: string): string {
  return `${options.manufacturerId}-${buildProductIdentityKey({
    manufacturerId: options.manufacturerId,
    productName: name,
    country: options.countriesOfficiallyDistributed[0] ?? options.headquartersCountry,
    productType: options.category,
    sourceIdentifier: options.sourceUrl
  })}`;
}

function extractTitle(text: string, sourceUrl: string): string {
  const firstHeading = text.split(/\n/).map((line) => line.trim()).find((line) => line.length > 2 && line.length < 90 && !/cookie|cart|menu|search/i.test(line));
  if (firstHeading) return firstHeading.replace(/\s+\|\s+.+$/, "");
  const slug = new URL(sourceUrl).pathname.split("/").filter(Boolean).pop() ?? "product";
  return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function parsePackagingFromText(text: string): PackagingOption[] {
  const options = new Map<string, PackagingOption>();
  for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*(kg|g|lb|lbs|l|ml)\s*(bag|bale|tub|sack|value bag)?/gi)) {
    const context = text.slice(match.index ?? 0, (match.index ?? 0) + 40);
    if (/bodyweight|body weight/i.test(context)) continue;
    if (!match[3] && match[2].toLowerCase() === "g") continue;
    const unit = match[2].toLowerCase() === "lbs" ? "lb" : (match[2].toLowerCase() as PackagingOption["unit"]);
    const option = { size: Number(match[1]), unit, label: match[0] };
    if (packageSortWeight(option) > 50) continue;
    options.set(`${option.size}:${option.unit}`, option);
  }
  return Array.from(options.values()).sort((a, b) => packageSortWeight(b) - packageSortWeight(a));
}

function packageSortWeight(option: PackagingOption): number {
  if (option.unit === "kg" || option.unit === "l") return option.size;
  if (option.unit === "lb") return option.size * 0.45359237;
  if (option.unit === "g" || option.unit === "ml") return option.size / 1000;
  return option.size;
}

function parseWarningsFromText(text: string): string[] {
  const warnings: string[] = [];
  for (const pattern of [/fresh drinking water[^.]+/i, /introduce[^.]+gradually[^.]+/i, /do not exceed[^.]+/i, /prohibited substance[^.]+/i, /unsuitable[^.]+/i]) {
    const match = text.match(pattern);
    if (match) warnings.push(match[0].trim());
  }
  return warnings;
}

function extractFeedingText(text: string): string | undefined {
  const match = text.match(/feeding (?:guide|guidelines|directions|recommendations)[\s\S]{0,1200}/i);
  return match?.[0].trim();
}

function confidenceFor(nutrients: NutrientMap, feedingRules: FeedingRule[], ingredients: unknown[]): FeedProduct["confidence"] {
  if (Object.keys(nutrients).length >= 8 && feedingRules.length && ingredients.length) return "high";
  if (Object.keys(nutrients).length >= 4) return "medium";
  return "low";
}

function confidenceBreakdown(nutrients: NutrientMap, feedingRules: FeedingRule[], ingredients: unknown[], availabilityEvidenceCount: number): ConfidenceBreakdown {
  return {
    identity: "medium",
    nutrientData: Object.keys(nutrients).length >= 8 ? "high" : Object.keys(nutrients).length ? "medium" : "low",
    feedingDirections: feedingRules.length ? "medium" : "low",
    ingredients: ingredients.length ? "medium" : "low",
    availability: availabilityEvidenceCount ? "medium" : "low",
    price: "low",
    explanation: [
      "Identity is derived from manufacturer, product URL, country, and product category.",
      "Nutrient confidence depends on extracted declared or typical analysis rows.",
      "Availability confidence is based on official manufacturer catalogue presence unless distributor evidence is attached.",
      "Price confidence remains low unless current public retailer observations are collected."
    ]
  };
}

function cleanLabel(label: string): string {
  return label.replace(/[-•|]+/g, " ").replace(/\s+/g, " ").trim();
}

function looksLikeNutrient(label: string): boolean {
  return /protein|lysine|methionine|fat|oil|fibre|fiber|starch|sugar|ndf|adf|calcium|phosph|magnesium|potassium|sodium|chloride|copper|zinc|manganese|iron|selenium|iodine|cobalt|vitamin|biotin|choline|omega|ash|moisture|energy|DE|ME|rohprotein|rohfett|rohfaser|rohasche|stärke|zucker|phosphor|natrium|kupfer|zink|mangan|jod|selen/i.test(label);
}

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
