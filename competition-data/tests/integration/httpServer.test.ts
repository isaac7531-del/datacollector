import { once } from "events";
import { describe, expect, it } from "vitest";
import { CompetitionDataEngine, InMemoryCompetitionDataRepository, createCompetitionDataApiServer } from "../../src";

describe("HTTP API", () => {
  it("serves health, ready and connectors", async () => {
    const repository = new InMemoryCompetitionDataRepository();
    const engine = new CompetitionDataEngine({ repository });
    const server = createCompetitionDataApiServer({ engine, repository });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No server address");

    const base = `http://127.0.0.1:${address.port}`;
    const health = await fetch(`${base}/health`).then((response) => response.json());
    const ready = await fetch(`${base}/ready`).then((response) => response.json());
    const connectors = await fetch(`${base}/connectors`).then((response) => response.json());
    server.close();

    expect(health.ok).toBe(true);
    expect(ready.ready).toBe(true);
    expect(connectors.items).toEqual([]);
  });
});
