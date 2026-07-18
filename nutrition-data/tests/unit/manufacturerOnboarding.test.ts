import { describe, expect, it } from "vitest";
import { onboardedManufacturerSourceConfigs, priorityCountryCodes } from "../../src/connectors/manufacturerSourceConfigs";

describe("manufacturer onboarding registry", () => {
  it("tracks a broad multi-country manufacturer cohort without enabling every source as fully automated", () => {
    expect(priorityCountryCodes).toEqual(expect.arrayContaining(["AU", "GB", "IE", "DE", "FR", "IT", "NZ", "US"]));
    expect(onboardedManufacturerSourceConfigs.length).toBeGreaterThanOrEqual(45);
    expect(onboardedManufacturerSourceConfigs.map((config) => config.manufacturerName)).toEqual(expect.arrayContaining([
      "Hygain",
      "Barastoc",
      "Pryde's EasiFeed",
      "Dengie",
      "Saracen Horse Feeds",
      "St. Hippolyt",
      "Agrobs",
      "Reverdy",
      "Equiplanet",
      "Triple Crown Feed",
      "Purina Animal Nutrition",
      "Dunstan",
      "Fiber Fresh",
      "NRM"
    ]));
    expect(onboardedManufacturerSourceConfigs.filter((config) => config.acquisitionMode === "administrator_assisted").length).toBeGreaterThan(20);
  });
});
