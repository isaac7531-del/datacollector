import { describe, expect, it, vi } from "vitest";
import { createLiveManufacturerConnector } from "../../src/connectors/liveManufacturerConnector";
import { launchManufacturerSourceConfigs } from "../../src/connectors/manufacturerSourceConfigs";

const page = `
<html><body>
<a href="/products/example-feed">Example Feed</a>
<h1>Example Feed</h1>
Crude Protein 14%
Starch 10%
Zinc 250 ppm
Feeding Guidelines Light Work 1 - 2 kg
Ingredients: alfalfa, corn, molasses. Nutritional
20kg bag
</body></html>`;

describe("live manufacturer connector", () => {
  it("discovers product links and normalises fetched public product pages", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith("/robots.txt")) return response("User-agent: *\nDisallow:");
      return response(page, "text/html");
    }) as unknown as typeof fetch;
    const config = { ...launchManufacturerSourceConfigs[0], catalogueUrls: ["https://example.test/feeds"], sitemapUrls: [], fallbackProductUrls: [] };
    const connector = createLiveManufacturerConnector({ config, fetchImpl, now: () => new Date("2026-01-01T00:00:00Z") });
    const items = await connector.discoverProducts();
    expect(items[0].url).toBe("https://example.test/products/example-feed");
    const payloads = await connector.fetchProduct(items[0]);
    const normalized = await connector.normalise(payloads[0]);
    expect(normalized.products[0].nutrients.crude_protein.value).toBe(14);
    expect(connector.telemetry().lastSuccessfulProductFetch).toBe("2026-01-01T00:00:00.000Z");
  });
});

function response(body: string, contentType = "text/plain"): Response {
  return new Response(body, { status: 200, headers: { "content-type": contentType } });
}
