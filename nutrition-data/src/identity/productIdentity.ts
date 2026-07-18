import { createHash } from "node:crypto";
import type { FeedProduct } from "../domain/types";
import type { ProductIdentityKey } from "../operations/types";

export function buildProductIdentityKey(input: ProductIdentityKey): string {
  const stable = [
    input.manufacturerId,
    clean(input.brand),
    clean(input.productName),
    clean(input.productCode),
    clean(input.barcode),
    clean(input.sku),
    input.country,
    clean(input.formulationRegion),
    clean(input.packageSize),
    input.productType ?? "",
    clean(input.sourceIdentifier)
  ].join("|");
  return createHash("sha256").update(stable).digest("hex").slice(0, 24);
}

export function productIdentityFromProduct(product: FeedProduct, country: string): ProductIdentityKey {
  return {
    manufacturerId: product.manufacturerId,
    brand: product.brand,
    productName: product.name,
    productCode: product.productCode,
    country,
    productType: product.category,
    sourceIdentifier: product.sourceUrls[0]
  };
}

export function duplicateCandidateScore(a: ProductIdentityKey, b: ProductIdentityKey): number {
  let score = 0;
  if (a.manufacturerId === b.manufacturerId) score += 0.35;
  if (clean(a.productName) === clean(b.productName)) score += 0.3;
  if (a.productCode && a.productCode === b.productCode) score += 0.2;
  if (a.country === b.country) score += 0.1;
  if (a.productType && a.productType === b.productType) score += 0.05;
  return Math.round(score * 100) / 100;
}

function clean(value?: string): string {
  return value?.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ?? "";
}
