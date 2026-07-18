import { once } from "events";
import { describe, expect, it } from "vitest";
import { CompetitionDataEngine, InMemoryCompetitionDataRepository, createCompetitionDataApiServer } from "../../src";

describe("source API routes", () => {
  it("exposes sources, capabilities, providers and workboard", async () => {
    const repository = new InMemoryCompetitionDataRepository();
    const engine = new CompetitionDataEngine({ repository });
    const server = createCompetitionDataApiServer({ engine, repository, exposeMetricsWithoutAuth: true });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No server address");
    const base = `http://127.0.0.1:${address.port}`;
    const sources = await fetch(`${base}/sources`).then((response) => response.json());
    const usea = await fetch(`${base}/sources/usea`).then((response) => response.json());
    const capabilities = await fetch(`${base}/sources/usea/capabilities`).then((response) => response.json());
    const providers = await fetch(`${base}/providers`).then((response) => response.json());
    const workboard = await fetch(`${base}/source-workboard`).then((response) => response.json());
    server.close();
    expect(sources.items.map((source: { id: string }) => source.id)).toContain("eventing-ireland");
    expect(usea.id).toBe("usea");
    expect(capabilities.capabilities.length).toBeGreaterThan(0);
    expect(providers.items.map((provider: { id: string }) => provider.id)).toContain("nominate");
    expect(workboard.items.length).toBeGreaterThan(0);
  });
});
