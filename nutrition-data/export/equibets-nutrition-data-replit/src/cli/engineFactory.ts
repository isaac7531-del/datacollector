import { createManualNutritionConnector } from "../connectors/manualConnector";
import { defaultManufacturers, defaultNutritionPayload } from "../config/defaultSeed";
import { InMemoryNutritionDataRepository } from "../repositories/inMemory";
import { NutritionDataEngine } from "../service/NutritionDataEngine";

export async function createSeededEngine(): Promise<NutritionDataEngine> {
  const repository = new InMemoryNutritionDataRepository();
  const connector = createManualNutritionConnector({
    manufacturer: defaultManufacturers[0],
    payload: defaultNutritionPayload,
    id: "default-seed"
  });
  const engine = new NutritionDataEngine({ repository, connectors: [connector] });
  await engine.runConnector(connector.descriptor.id);
  return engine;
}
