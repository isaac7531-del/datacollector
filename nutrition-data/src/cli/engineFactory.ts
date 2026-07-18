import { createManualNutritionConnector } from "../connectors/manualConnector";
import { createLiveManufacturerConnectors } from "../connectors/liveManufacturerConnector";
import { launchManufacturerSourceConfigs } from "../connectors/manufacturerSourceConfigs";
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

export async function createOperationalEngine(options: { includeSeed?: boolean } = {}): Promise<NutritionDataEngine> {
  return (await createOperationalRuntime(options)).engine;
}

export async function createOperationalRuntime(options: { includeSeed?: boolean } = {}): Promise<{ engine: NutritionDataEngine; repository: InMemoryNutritionDataRepository }> {
  const repository = new InMemoryNutritionDataRepository();
  const connectors = createLiveManufacturerConnectors(launchManufacturerSourceConfigs);
  const engine = new NutritionDataEngine({ repository, connectors });
  if (options.includeSeed) {
    const connector = createManualNutritionConnector({
      manufacturer: defaultManufacturers[0],
      payload: defaultNutritionPayload,
      id: "default-seed"
    });
    engine.registerConnector(connector);
    await engine.runConnector(connector.descriptor.id);
  }
  return { engine, repository };
}
