import type { FeedProduct, ProductComparison } from "../domain/types";
import { AvailabilityEngine } from "../availability/availabilityEngine";
import { CostEngine } from "../costs/costEngine";

export class ComparisonEngine {
  constructor(private readonly availability = new AvailabilityEngine(), private readonly costs = new CostEngine()) {}

  compareProducts(products: FeedProduct[], options: { nutrientKeys?: string[]; country?: string; currency?: string } = {}): ProductComparison {
    const nutrientKeys = options.nutrientKeys ?? Array.from(new Set(products.flatMap((product) => Object.keys(product.nutrients)))).sort();
    const rows = products.map((product) => {
      const availabilityRank = options.country
        ? this.availability.evaluate(product, { country: options.country, allowImportedFeeds: true }).rank
        : 50;
      return {
        productId: product.id,
        productName: product.name,
        manufacturerName: product.manufacturerName,
        category: product.category,
        nutrients: Object.fromEntries(nutrientKeys.map((key) => [key, product.nutrients[key]])),
        costPerKg: this.costs.summariseProduct(product, 1, options.currency).costPerKg,
        availabilityRank
      };
    });
    return { products, nutrientKeys, rows };
  }
}
