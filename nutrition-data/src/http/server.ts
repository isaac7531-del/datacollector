import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { forageLaboratories, parseForageLaboratoryImport } from "../forage/laboratoryImports";
import { PriceHistoryEngine } from "../costs/priceHistory";
import type { NutritionDataEngine } from "../service/NutritionDataEngine";

export interface NutritionHttpServerOptions {
  engine: NutritionDataEngine;
}

export function createNutritionHttpServer(options: NutritionHttpServerOptions) {
  return createServer(async (request, response) => {
    try {
      await route(options.engine, request, response);
    } catch (error) {
      json(response, 500, { error: error instanceof Error ? error.message : "Unknown server error" });
    }
  });
}

async function route(engine: NutritionDataEngine, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (request.method === "GET" && url.pathname === "/health") return json(response, 200, { status: "ok", service: "@equibets/nutrition-data" });
  if (request.method === "GET" && url.pathname === "/products") {
    return json(response, 200, await engine.searchProducts({
      text: url.searchParams.get("q") ?? undefined,
      country: url.searchParams.get("country") ?? undefined,
      includeImported: url.searchParams.get("includeImported") === "true"
    }));
  }
  if (request.method === "GET" && url.pathname === "/manufacturers") return json(response, 200, await engine.listManufacturers());
  if (request.method === "GET" && url.pathname.match(/^\/manufacturers\/[^/]+$/)) {
    const id = url.pathname.split("/")[2];
    return json(response, 200, engine.getConnector(id) ?? (await engine.listManufacturers()).find((manufacturer) => manufacturer.id === id) ?? { error: "Not found" });
  }
  if (request.method === "GET" && url.pathname.match(/^\/manufacturers\/[^/]+\/status$/)) {
    const id = url.pathname.split("/")[2];
    return json(response, 200, await engine.manufacturerStatus(id));
  }
  if (request.method === "GET" && url.pathname.startsWith("/manufacturers/") && url.pathname.endsWith("/health")) {
    const id = url.pathname.split("/")[2];
    return json(response, 200, await engine.connectorHealth(id));
  }
  if (request.method === "GET" && url.pathname.match(/^\/manufacturers\/[^/]+\/products$/)) {
    const id = url.pathname.split("/")[2];
    return json(response, 200, await engine.listProducts({ manufacturerId: id, includeDiscontinued: true }));
  }
  if (request.method === "GET" && url.pathname.match(/^\/manufacturers\/[^/]+\/acceptance$/)) {
    const id = url.pathname.split("/")[2];
    return json(response, 200, await engine.manufacturerAcceptance(id));
  }
  if (request.method === "POST" && url.pathname.startsWith("/manufacturers/") && url.pathname.endsWith("/refresh")) {
    const id = url.pathname.split("/")[2];
    return json(response, 200, await engine.runConnector(id));
  }
  if (request.method === "GET" && url.pathname.match(/^\/products\/[^/]+\/versions$/)) {
    const id = url.pathname.split("/")[2];
    return json(response, 200, await engine.productVersions(id));
  }
  if (request.method === "GET" && url.pathname.match(/^\/products\/[^/]+$/)) {
    const id = url.pathname.split("/")[2];
    return json(response, 200, await engine.getProduct(id) ?? { error: "Not found" });
  }
  if (request.method === "GET" && url.pathname.match(/^\/products\/[^/]+\/nutrients$/)) {
    const product = await engine.getProduct(url.pathname.split("/")[2]);
    return json(response, product ? 200 : 404, product?.nutrients ?? { error: "Not found" });
  }
  if (request.method === "GET" && url.pathname.match(/^\/products\/[^/]+\/ingredients$/)) {
    const product = await engine.getProduct(url.pathname.split("/")[2]);
    return json(response, product ? 200 : 404, product?.ingredients ?? { error: "Not found" });
  }
  if (request.method === "GET" && url.pathname.match(/^\/products\/[^/]+\/feeding-directions$/)) {
    const product = await engine.getProduct(url.pathname.split("/")[2]);
    return json(response, product ? 200 : 404, { feedingDirections: product?.feedingDirections, rules: product?.metadata?.feedingRules ?? [] });
  }
  if (request.method === "GET" && url.pathname.match(/^\/products\/[^/]+\/availability$/)) {
    const id = url.pathname.split("/")[2];
    return json(response, 200, await engine.availabilityEvidence({ productId: id }));
  }
  if (request.method === "GET" && url.pathname.match(/^\/products\/[^/]+\/price-history$/)) {
    const id = url.pathname.split("/")[2];
    return json(response, 200, await engine.priceHistory({ productId: id }));
  }
  if (request.method === "GET" && url.pathname.match(/^\/products\/[^/]+\/prices$/)) {
    const id = url.pathname.split("/")[2];
    return json(response, 200, await engine.priceHistory({ productId: id }));
  }
  if (request.method === "GET" && url.pathname.match(/^\/products\/[^/]+\/alternatives$/)) {
    const product = await engine.getProduct(url.pathname.split("/")[2]);
    return json(response, product ? 200 : 404, product ? await engine.searchProducts({ categories: [product.category], country: product.availability.countries[0] }) : { error: "Not found" });
  }
  if (request.method === "GET" && url.pathname === "/availability") {
    return json(response, 200, await engine.availabilityEvidence({
      country: url.searchParams.get("country") ?? undefined,
      staleBefore: url.searchParams.get("staleBefore") ?? undefined
    }));
  }
  if (request.method === "GET" && url.pathname === "/availability/distributors") {
    return json(response, 200, await engine.distributorStockists({
      country: url.searchParams.get("country") ?? undefined,
      manufacturerId: url.searchParams.get("manufacturerId") ?? undefined
    }));
  }
  if (request.method === "GET" && url.pathname === "/operations/runs") return json(response, 200, await engine.operationalRuns());
  if (request.method === "GET" && url.pathname === "/operations/issues") return json(response, 200, await engine.operationalIssues({ unresolvedOnly: url.searchParams.get("unresolvedOnly") === "true" }));
  if (request.method === "GET" && url.pathname === "/forage-labs") return json(response, 200, forageLaboratories);
  if (request.method === "POST" && url.pathname === "/forage-labs/import") return json(response, 200, parseForageLaboratoryImport(await body(request)));
  if (request.method === "GET" && url.pathname.match(/^\/forage-analyses\/[^/]+$/)) return json(response, 501, { error: "Forage analysis persistence is repository-adapter owned." });
  if (request.method === "GET" && url.pathname.match(/^\/forage-analyses\/[^/]+\/versions$/)) return json(response, 501, { error: "Forage analysis version persistence is repository-adapter owned." });
  if (request.method === "GET" && url.pathname === "/price-observations") return json(response, 200, await engine.priceHistory({ country: url.searchParams.get("country") ?? undefined }));
  if (request.method === "GET" && url.pathname === "/price-trends") {
    const observations = await engine.priceHistory({ productId: url.searchParams.get("productId") ?? undefined, country: url.searchParams.get("country") ?? undefined });
    return json(response, 200, new PriceHistoryEngine().summarise(observations as any, { productId: url.searchParams.get("productId") ?? undefined, country: url.searchParams.get("country") ?? undefined }));
  }
  if (request.method === "GET" && url.pathname === "/manufacturer-workboard") return json(response, 200, await engine.manufacturerWorkboard());
  if (request.method === "POST" && url.pathname === "/requirements") return json(response, 200, engine.calculateRequirements(await body(request)));
  if (request.method === "POST" && url.pathname === "/programs/analyse") return json(response, 200, engine.analyseFeedingProgram(await body(request)));
  if (request.method === "POST" && url.pathname === "/recommendations") return json(response, 200, await engine.recommendForProgram(await body(request)));
  if (request.method === "POST" && url.pathname === "/ingestion/run") return json(response, 200, await engine.runIngestion());
  return json(response, 404, { error: "Not found" });
}

async function body(request: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value, null, 2));
}
