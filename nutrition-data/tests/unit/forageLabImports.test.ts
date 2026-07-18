import { describe, expect, it } from "vitest";
import { forageLaboratories, parseForageLaboratoryImport } from "../../src/forage/laboratoryImports";

describe("forage laboratory imports", () => {
  it("registers the priority forage laboratories", () => {
    expect(forageLaboratories.map((lab) => lab.id)).toEqual(expect.arrayContaining(["equi-analytical", "dairy-one", "cvas", "eurofins", "local"]));
  });

  it("imports CSV forage lab results as laboratory analyses", () => {
    const analysis = parseForageLaboratoryImport({
      laboratory: "equi-analytical",
      sampleDate: "2026-01-15",
      forageType: "hay",
      text: "Nutrient,Value,Unit\nDry Matter,91,%\nCrude Protein,12,%\nADF,32,%\nNDF,55,%\nESC,7,%\nStarch,2,%\nCalcium,0.45,%"
    });
    expect(analysis.source).toBe("laboratory_test");
    expect(analysis.laboratory).toBe("Equi-Analytical");
    expect(analysis.nutrients.crude_protein.value).toBe(12);
    expect(analysis.nutrients.adf.value).toBe(32);
    expect(analysis.dryMatterPercent).toBe(91);
  });
});
