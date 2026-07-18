import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import { createManualConnector, createNutritionDataEngine, InMemoryNutritionDataRepository } from "../../src";
import { defaultManufacturers, defaultNutritionPayload } from "../../src/config/defaultSeed";
import { createNutritionHttpServer } from "../../src/http/server";

let server: Server;
let baseUrl: string;

describe("operational HTTP API", () => {
  beforeAll(async () => {
    const repository = new InMemoryNutritionDataRepository();
    const connector = createManualConnector({ manufacturer: defaultManufacturers[0], payload: defaultNutritionPayload, id: "mitavite-au" });
    const engine = createNutritionDataEngine({ repository, connectors: [connector] });
    await engine.runConnector(connector.descriptor.id);
    server = createNutritionHttpServer({ engine });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server address.");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("exposes manufacturer status and workboard endpoints", async () => {
    const status = await getJson("/manufacturers/mitavite-au/status");
    expect(status.manufacturerId).toBe("mitavite-au");
    const workboard = await getJson("/manufacturer-workboard");
    expect(Array.isArray(workboard)).toBe(true);
    expect(workboard.length).toBeGreaterThan(0);
  });

  it("exposes product subresources and forage lab endpoints", async () => {
    const productId = defaultNutritionPayload.products[0].id;
    expect(await getJson(`/products/${productId}/nutrients`)).toHaveProperty("crude_protein");
    expect(await getJson("/forage-labs")).toEqual(expect.arrayContaining([expect.objectContaining({ id: "equi-analytical" })]));
  });
});

async function getJson(path: string): Promise<any> {
  const response = await fetch(`${baseUrl}${path}`);
  expect(response.ok).toBe(true);
  return response.json();
}
