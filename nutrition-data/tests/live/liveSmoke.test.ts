import { describe, expect, it } from "vitest";
import { createLiveManufacturerConnector } from "../../src/connectors/liveManufacturerConnector";
import { launchManufacturerSourceConfigs } from "../../src/connectors/manufacturerSourceConfigs";

const runLive = process.env.NUTRITION_LIVE_SMOKE === "1";

describe.skipIf(!runLive)("live manufacturer smoke tests", () => {
  it("discovers at least one public product for each launch connector", async () => {
    for (const config of launchManufacturerSourceConfigs) {
      const connector = createLiveManufacturerConnector({ config });
      const items = await connector.discoverProducts({ countryCode: config.countriesOfficiallyDistributed[0] });
      expect(items.length, config.id).toBeGreaterThan(0);
    }
  }, 120_000);
});
