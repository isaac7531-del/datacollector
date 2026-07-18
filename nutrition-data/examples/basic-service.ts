import { createNutritionDataEngine, createManualConnector, InMemoryNutritionDataRepository } from "../src";
import { defaultManufacturers, defaultNutritionPayload } from "../src/config/defaultSeed";

const repository = new InMemoryNutritionDataRepository();
const connector = createManualConnector({
  manufacturer: defaultManufacturers[0],
  payload: defaultNutritionPayload,
  id: "example-seed"
});

const engine = createNutritionDataEngine({ repository, connectors: [connector] });
await engine.runConnector(connector.descriptor.id);

const products = await engine.searchProducts({ country: "AU" });
console.log(products.map((product) => product.name));
