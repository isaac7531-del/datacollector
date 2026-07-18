import type { FeedingRule } from "../operations/types";
import type { Workload } from "../domain/types";

const WORKLOADS: Array<[RegExp, Workload | "racing" | "breeding" | "pregnancy" | "lactation" | "youngstock" | "pony" | "senior" | "weight_gain" | "weight_loss"]> = [
  [/maintenance|rest/i, "maintenance"],
  [/light/i, "light"],
  [/moderate|medium/i, "moderate"],
  [/hard|heavy/i, "heavy"],
  [/race|racing/i, "racing"],
  [/breeding|stud/i, "breeding"],
  [/pregnan|foetal/i, "pregnancy"],
  [/lactat/i, "lactation"],
  [/youngstock|yearling|foal|growth/i, "youngstock"],
  [/pony/i, "pony"],
  [/senior|veteran/i, "senior"],
  [/weight gain|condition/i, "weight_gain"],
  [/weight loss|good doer/i, "weight_loss"]
];

export function parseFeedingRules(text: string, productId: string, sourceUrl?: string): FeedingRule[] {
  const rules: FeedingRule[] = [];
  const compact = text.replace(/\s+/g, " ");
  const perBodyWeight = compact.match(/(\d+(?:\.\d+)?)\s*(?:g|grams|kg)\s*[-–to]*\s*(\d+(?:\.\d+)?)?\s*(g|grams|kg)?\s*\/?\s*100\s*kg bodyweight/i);
  if (perBodyWeight) {
    const unit = normaliseFeedingUnit(perBodyWeight[3] || perBodyWeight[0]);
    rules.push({
      id: `${productId}:per-100kg`,
      productId,
      condition: {},
      amount: { min: Number(perBodyWeight[1]), max: perBodyWeight[2] ? Number(perBodyWeight[2]) : undefined, unit, per: "100kg_bodyweight" },
      originalText: perBodyWeight[0],
      sourceUrl,
      confidence: "medium"
    });
  }

  const lineRegex = /(maintenance|light work|moderate work|medium work|hard work|heavy work|racing|breeding|senior|youngstock)[^\d]{0,50}(\d+(?:\.\d+)?)\s*(?:-|–|to)?\s*(\d+(?:\.\d+)?)?\s*(kg|g|lb|lbs|scoops?)/gi;
  for (const match of compact.matchAll(lineRegex)) {
    rules.push({
      id: `${productId}:${rules.length + 1}`,
      productId,
      condition: { workload: workloadFor(match[1]) },
      amount: { min: Number(match[2]), max: match[3] ? Number(match[3]) : undefined, unit: normaliseFeedingUnit(match[4]), per: "day" },
      originalText: match[0],
      sourceUrl,
      confidence: "medium"
    });
  }

  return dedupeRules(rules);
}

function workloadFor(value: string): FeedingRule["condition"]["workload"] {
  return WORKLOADS.find(([regex]) => regex.test(value))?.[1] ?? "maintenance";
}

function normaliseFeedingUnit(value: string): FeedingRule["amount"]["unit"] {
  if (/kg/i.test(value)) return "kg";
  if (/lb/i.test(value)) return "lb";
  if (/scoop/i.test(value)) return "scoop";
  if (/oz/i.test(value)) return "oz";
  return "g";
}

function dedupeRules(rules: FeedingRule[]): FeedingRule[] {
  const seen = new Set<string>();
  return rules.filter((rule) => {
    const key = `${rule.condition.workload ?? ""}:${rule.amount.min}:${rule.amount.max ?? ""}:${rule.amount.unit}:${rule.amount.per ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
