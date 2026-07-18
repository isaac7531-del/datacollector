import { describe, expect, it } from "vitest";
import { createBritishEventingConnector, createRechenstelleConnector } from "../../src";

describe.skipIf(process.env.LIVE_SOURCE_SMOKE !== "1")("live source smoke tests", () => {
  it("discovers and collects a small Rechenstelle public event", async () => {
    const connector = createRechenstelleConnector({
      enabled: true,
      agendaUrls: ["https://www.rechenstelle.de/en/agenda/2025/wiesbaden/"]
    });
    const items = await connector.discover({});
    expect(items.length).toBeGreaterThan(0);
    const payloads = await connector.collect(items[0], { importBatchId: "live-smoke" });
    expect(payloads[0]?.data).toBeTruthy();
  }, 60_000);

  it("discovers and collects a British Eventing public result page", async () => {
    const connector = createBritishEventingConnector({
      enabled: true,
      eventUrls: ["https://www.britisheventing.com/results/event/THE-GRASSROOTS-CHAMPIONSHIPS~20098881"]
    });
    const items = await connector.discover({});
    expect(items[0]?.metadata).toBeTruthy();
    const payloads = await connector.collect(items[0], { importBatchId: "live-smoke" });
    expect(payloads[0]?.data).toBeTruthy();
  }, 60_000);
});
