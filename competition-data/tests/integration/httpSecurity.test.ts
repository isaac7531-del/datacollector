import { once } from "events";
import { describe, expect, it } from "vitest";
import { CompetitionDataEngine, InMemoryCompetitionDataRepository, createCompetitionDataApiServer } from "../../src";

describe("HTTP security controls", () => {
  it("requires auth for mutations by default and can expose metrics explicitly", async () => {
    const repository = new InMemoryCompetitionDataRepository();
    const engine = new CompetitionDataEngine({ repository });
    const server = createCompetitionDataApiServer({ engine, repository, exposeMetricsWithoutAuth: true });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No server address");
    const base = `http://127.0.0.1:${address.port}`;
    const mutation = await fetch(`${base}/manual-results`, { method: "POST", body: JSON.stringify({}) });
    const metrics = await fetch(`${base}/metrics`);
    server.close();

    expect(mutation.status).toBe(403);
    expect(metrics.status).toBe(200);
    expect(await metrics.text()).toContain("competition_data_import_runs_total");
  });
});
