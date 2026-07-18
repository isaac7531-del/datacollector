import type { FeedProduct, MoneyAmount } from "../domain/types";
import { convertFeedAmountToKg } from "../normalisation/nutrients";

export interface ProductCostSummary {
  productId: string;
  currency: string;
  costPerKg?: MoneyAmount;
  costPerDay?: MoneyAmount;
  costPerMonth?: MoneyAmount;
  costPerNutrient: Record<string, MoneyAmount>;
}

export class CostEngine {
  summariseProduct(product: FeedProduct, fedKgPerDay = 1, currency = product.prices[0]?.currency ?? "USD"): ProductCostSummary {
    const price = product.prices.find((candidate) => candidate.currency === currency) ?? product.prices[0];
    if (!price) return { productId: product.id, currency, costPerNutrient: {} };
    const packageKg = convertFeedAmountToKg(
      price.packageSize.size,
      price.packageSize.unit === "kg" || price.packageSize.unit === "g" || price.packageSize.unit === "lb" ? price.packageSize.unit : "kg"
    );
    const costPerKg = packageKg > 0 ? price.amount / packageKg : undefined;
    const costPerDay = costPerKg === undefined ? undefined : costPerKg * fedKgPerDay;
    const costPerNutrient: Record<string, MoneyAmount> = {};
    for (const nutrient of Object.values(product.nutrients)) {
      if (!costPerKg || !nutrient.value) continue;
      costPerNutrient[nutrient.key] = money(costPerKg / nutrient.value, price.currency);
    }
    return {
      productId: product.id,
      currency: price.currency,
      costPerKg: costPerKg === undefined ? undefined : money(costPerKg, price.currency),
      costPerDay: costPerDay === undefined ? undefined : money(costPerDay, price.currency),
      costPerMonth: costPerDay === undefined ? undefined : money(costPerDay * 30.4375, price.currency),
      costPerNutrient
    };
  }

  cheapestEquivalent(products: FeedProduct[], nutrientKey: string, currency?: string): FeedProduct | undefined {
    return [...products].sort((a, b) => {
      const aCost = this.summariseProduct(a, 1, currency).costPerNutrient[nutrientKey]?.amount ?? Number.POSITIVE_INFINITY;
      const bCost = this.summariseProduct(b, 1, currency).costPerNutrient[nutrientKey]?.amount ?? Number.POSITIVE_INFINITY;
      return aCost - bCost;
    })[0];
  }
}

function money(amount: number, currency: string): MoneyAmount {
  return { amount: Math.round(amount * 100) / 100, currency };
}
