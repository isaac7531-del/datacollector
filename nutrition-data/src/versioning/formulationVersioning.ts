import { createHash } from "node:crypto";
import type { FeedProduct } from "../domain/types";
import type { ImmutableProductVersion, ProductChangeClassification } from "../operations/types";

export function checksumProductFormulation(product: FeedProduct): string {
  return createHash("sha256")
    .update(JSON.stringify({
      name: product.name,
      category: product.category,
      nutrients: product.nutrients,
      ingredients: product.ingredients,
      feedingDirections: product.feedingDirections,
      packaging: product.packaging,
      warnings: product.warnings,
      availability: product.availability,
      discontinued: product.discontinued
    }))
    .digest("hex");
}

export function createImmutableProductVersion(product: FeedProduct, previous?: ImmutableProductVersion): ImmutableProductVersion {
  const changedFields = previous ? changedProductFields(previous.product, product) : ["created"];
  const classification = previous ? classifyChanges(previous.product, product, changedFields) : undefined;
  return {
    id: `${product.id}:v${(previous ? Number(previous.version.replace(/^v/, "")) + 1 : 1).toString()}`,
    productId: product.id,
    version: previous ? `v${Number(previous.version.replace(/^v/, "")) + 1}` : "v1",
    capturedAt: new Date().toISOString(),
    sourceChecksum: checksumProductFormulation(product),
    product,
    changeClassification: classification,
    changedFields,
    previousVersionId: previous?.id
  };
}

export function changedProductFields(previous: FeedProduct, next: FeedProduct): string[] {
  const fields: Array<keyof FeedProduct> = ["name", "category", "nutrients", "ingredients", "feedingDirections", "packaging", "warnings", "availability", "discontinued"];
  return fields.filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field]));
}

export function classifyChanges(previous: FeedProduct, next: FeedProduct, changedFields = changedProductFields(previous, next)): ProductChangeClassification | undefined {
  if (next.discontinued || next.availability.discontinued) return "discontinued";
  if (changedFields.includes("nutrients") || changedFields.includes("ingredients")) return "formulation";
  if (changedFields.includes("feedingDirections")) return "feeding_guidance";
  if (changedFields.includes("availability")) return "availability";
  if (changedFields.includes("packaging")) return "packaging";
  if (changedFields.includes("warnings")) return "nutrient_declaration";
  if (changedFields.includes("name")) return "cosmetic";
  return undefined;
}
