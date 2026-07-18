import { describe, expect, it } from "vitest";
import { defaultProducts } from "../../src/config/defaultSeed";
import { buildProductIdentityKey, duplicateCandidateScore } from "../../src/identity/productIdentity";
import { createImmutableProductVersion, classifyChanges } from "../../src/versioning/formulationVersioning";

describe("product identity and formulation versioning", () => {
  it("uses country as part of identity so regional formulations do not merge", () => {
    const au = buildProductIdentityKey({ manufacturerId: "brand", productName: "Balancer", country: "AU", productType: "balancer" });
    const gb = buildProductIdentityKey({ manufacturerId: "brand", productName: "Balancer", country: "GB", productType: "balancer" });
    expect(au).not.toBe(gb);
  });

  it("scores duplicate candidates without name-only merges", () => {
    const score = duplicateCandidateScore(
      { manufacturerId: "a", productName: "Senior", country: "AU" },
      { manufacturerId: "b", productName: "Senior", country: "US" }
    );
    expect(score).toBeLessThan(0.5);
  });

  it("creates immutable versions and classifies formulation changes", () => {
    const first = createImmutableProductVersion(defaultProducts[0]);
    const changed = { ...defaultProducts[0], nutrients: { ...defaultProducts[0].nutrients, starch: { ...defaultProducts[0].nutrients.starch, value: 8 } } };
    const second = createImmutableProductVersion(changed, first);
    expect(second.previousVersionId).toBe(first.id);
    expect(classifyChanges(defaultProducts[0], changed)).toBe("formulation");
  });
});
