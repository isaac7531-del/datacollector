import type { FeedProduct, FeedingProgramAnalysis, Recommendation } from "../domain/types";
import { AvailabilityEngine } from "../availability/availabilityEngine";
import { CostEngine } from "../costs/costEngine";

export interface RecommendationOptions {
  candidateProducts: FeedProduct[];
  maxRecommendations?: number;
}

export class RecommendationEngine {
  constructor(private readonly availability = new AvailabilityEngine(), private readonly costs = new CostEngine()) {}

  recommend(analysis: FeedingProgramAnalysis, options: RecommendationOptions): Recommendation[] {
    const availableProducts = this.availability.filterAndRank(options.candidateProducts, analysis.program.horse.location);
    const recommendations: Recommendation[] = [];

    for (const balance of Object.values(analysis.balances)) {
      if (balance.status !== "deficient" && balance.status !== "low" && balance.status !== "excess") continue;

      if (balance.status === "excess") {
        recommendations.push({
          id: `reduce-${balance.key}`,
          type: "reduce_nutrient",
          title: `Reduce ${balance.label}`,
          reason: `${balance.label} is above the safe or configured range for this horse.`,
          evidence: [balance.explanation, analysis.requirementProfile.requirements[balance.key]?.rationale ?? "Requirement profile flagged this nutrient."],
          confidence: "medium",
          nutritionalImpact: { [balance.key]: balance.gap ?? 0 },
          availability: analysis.program.items[0]?.product?.availability ?? { countries: [analysis.program.horse.location.country], availabilityConfidence: "medium" },
          priority: 20,
          imported: false
        });
        continue;
      }

      const candidate = availableProducts.find((entry) => entry.product.nutrients[balance.key]);
      if (!candidate) continue;
      const costSummary = this.costs.summariseProduct(candidate.product, 1, analysis.program.currency);
      recommendations.push({
        id: `add-${balance.key}-${candidate.product.id}`,
        type: "add_product",
        title: `Add or increase ${candidate.product.name}`,
        reason: `This product supplies ${balance.label}, which is ${balance.status} in the current program.`,
        evidence: [
          balance.explanation,
          candidate.reason,
          `${candidate.product.name} contains ${candidate.product.nutrients[balance.key]?.value} ${candidate.product.nutrients[balance.key]?.unit} ${balance.label}.`
        ],
        confidence: confidenceFrom(candidate.rank, candidate.product.confidence),
        costImpact: costSummary.costPerDay,
        nutritionalImpact: { [balance.key]: candidate.product.nutrients[balance.key]?.value ?? 0 },
        availability: candidate.product.availability,
        product: candidate.product,
        priority: priorityFor(balance.status, candidate.rank),
        imported: candidate.imported
      });
    }

    for (const warning of analysis.warnings) {
      if (/starch|sugar/i.test(warning)) {
        const lowStarchCandidate = availableProducts.find((entry) => {
          const starch = entry.product.nutrients.starch?.value ?? 100;
          const sugar = entry.product.nutrients.sugar?.value ?? 100;
          return starch + sugar <= 12;
        });
        if (lowStarchCandidate) {
          recommendations.push({
            id: `replace-low-nsc-${lowStarchCandidate.product.id}`,
            type: "replace_product",
            title: `Consider lower starch alternative ${lowStarchCandidate.product.name}`,
            reason: "The current ration has a high starch and sugar load.",
            evidence: [warning, lowStarchCandidate.reason],
            confidence: confidenceFrom(lowStarchCandidate.rank, lowStarchCandidate.product.confidence),
            nutritionalImpact: {
              starch: lowStarchCandidate.product.nutrients.starch?.value ?? 0,
              sugar: lowStarchCandidate.product.nutrients.sugar?.value ?? 0
            },
            availability: lowStarchCandidate.product.availability,
            product: lowStarchCandidate.product,
            priority: 30,
            imported: lowStarchCandidate.imported
          });
        }
      }
    }

    return recommendations
      .sort((a, b) => a.priority - b.priority || confidenceSort(a.confidence) - confidenceSort(b.confidence))
      .slice(0, options.maxRecommendations ?? 10);
  }
}

function priorityFor(status: "deficient" | "low" | "adequate" | "excess" | "unknown", availabilityRank: number): number {
  const base = status === "deficient" ? 10 : 25;
  return base + Math.min(availabilityRank, 80) / 10;
}

function confidenceFrom(rank: number, productConfidence: Recommendation["confidence"]): Recommendation["confidence"] {
  if (rank <= 15 && (productConfidence === "verified" || productConfidence === "high")) return "high";
  if (rank <= 40) return "medium";
  return "low";
}

function confidenceSort(confidence: Recommendation["confidence"]): number {
  if (confidence === "verified") return 0;
  if (confidence === "high") return 1;
  if (confidence === "medium") return 2;
  return 3;
}
