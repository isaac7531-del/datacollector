import type { FeedingProgramAnalysis, HorseProfile, Recommendation } from "../domain/types";

const MEDICAL_RISK_PATTERNS = [
  /laminitis/i,
  /insulin|ems/i,
  /ppid|cushing/i,
  /tying[-\s]?up/i,
  /kidney|renal/i,
  /liver|hepatic/i
];

export class NutritionSafetyEngine {
  warningsForHorse(horse: HorseProfile): string[] {
    const warnings: string[] = [];
    if (horse.medicalConditions?.some((condition) => MEDICAL_RISK_PATTERNS.some((pattern) => pattern.test(condition)))) {
      warnings.push("Medical risk is present; consult a veterinarian or qualified equine nutritionist before changing the ration.");
    }
    if (horse.pregnancy || horse.lactation) warnings.push("Pregnancy or lactation materially changes requirements; seek qualified nutrition advice.");
    if (horse.growthStage && horse.growthStage !== "adult") warnings.push("Youngstock requirements and mineral balance require qualified oversight.");
    if (horse.bodyConditionScore !== undefined && (horse.bodyConditionScore <= 3 || horse.bodyConditionScore >= 8)) warnings.push("Severe underweight or obesity risk requires professional assessment.");
    return warnings;
  }

  warningsForAnalysis(analysis: FeedingProgramAnalysis): string[] {
    const warnings = [...this.warningsForHorse(analysis.program.horse)];
    if (analysis.balances.selenium?.status === "excess") warnings.push("Selenium appears excessive; do not add selenium sources without professional advice.");
    if (analysis.balances.vitamin_a?.status === "excess" || analysis.balances.vitamin_d?.status === "excess") warnings.push("Fat-soluble vitamin excess risk requires professional review.");
    if (analysis.dailyDryMatterKg > analysis.program.horse.weightKg * 0.035) warnings.push("Daily feed quantity may be unsafe or impractical; review forage and concentrate amounts.");
    if (analysis.program.items.some((item) => item.product?.warnings.some((warning) => /prohibited|competition/i.test(warning)))) warnings.push("One or more products carries a competition/prohibited-substance warning claim.");
    return warnings;
  }

  annotateRecommendations(recommendations: Recommendation[], analysis: FeedingProgramAnalysis): Recommendation[] {
    const safetyWarnings = this.warningsForAnalysis(analysis);
    if (!safetyWarnings.length) return recommendations;
    return recommendations.map((recommendation) => ({
      ...recommendation,
      evidence: [...recommendation.evidence, ...safetyWarnings],
      confidence: recommendation.confidence === "verified" ? "high" : recommendation.confidence
    }));
  }
}
