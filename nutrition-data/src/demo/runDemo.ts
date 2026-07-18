import { createOperationalEngine } from "../cli/engineFactory";

async function main(): Promise<void> {
  const engine = await createOperationalEngine({ includeSeed: true });
  const products = await engine.searchProducts({ country: "AU", includeImported: false });
  const horse = {
    species: "horse" as const,
    ageYears: 8,
    weightKg: 500,
    workload: "moderate" as const,
    goals: ["performance" as const],
    location: { country: "AU", currency: "AUD" }
  };

  const program = {
    horse,
    currency: "AUD",
    items: products.slice(0, 1).map((product) => ({ id: product.id, productId: product.id, product, amountPerDay: 1, unit: "kg" as const, role: "feed" as const }))
  };

  console.log(JSON.stringify({
    connectors: engine.listConnectors().length,
    products: products.length,
    requirements: engine.calculateRequirements(horse).metadata,
    analysis: engine.analyseFeedingProgram(program).warnings,
    recommendations: (await engine.recommendForProgram(program, { maxRecommendations: 3 })).recommendations.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
