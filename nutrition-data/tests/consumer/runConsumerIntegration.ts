import {
  createLiveManufacturerConnectors,
  createNutritionDataEngine,
  InMemoryNutritionDataRepository,
  launchManufacturerSourceConfigs
} from "../../src";

async function main(): Promise<void> {
  const repository = new InMemoryNutritionDataRepository();
  const engine = createNutritionDataEngine({
    repository,
    connectors: createLiveManufacturerConnectors(launchManufacturerSourceConfigs.slice(0, 1))
  });
  const connectors = engine.listConnectors();
  if (!connectors.length) throw new Error("Expected at least one operational connector export.");
  const requirements = engine.calculateRequirements({
    species: "horse",
    ageYears: 9,
    weightKg: 500,
    workload: "moderate",
    goals: ["performance"],
    location: { country: "AU", currency: "AUD" }
  });
  if (!requirements.metadata?.standard) throw new Error("Expected requirement standard metadata.");
  console.log(JSON.stringify({ ok: true, connectors: connectors.length, standard: requirements.metadata.standard }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
