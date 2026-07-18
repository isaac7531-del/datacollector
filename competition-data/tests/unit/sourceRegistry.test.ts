import { describe, expect, it } from "vitest";
import { detectProvider, getRegisteredSource, listRegisteredProviders, listRegisteredSources, mapSourceLabel, validSourceIds } from "../../src";

describe("source registry", () => {
  it("registers every canonical Phase 4B source", () => {
    expect(validSourceIds()).toEqual([
      "rechenstelle",
      "british-eventing",
      "fei",
      "eventing-ireland",
      "usea",
      "equiratings",
      "france-eventing",
      "italy-eventing",
      "equestrian-australia"
    ]);
    expect(listRegisteredSources()).toHaveLength(9);
  });

  it("resolves aliases and reports lifecycle/acquisition mode", () => {
    expect(getRegisteredSource("EI")?.id).toBe("eventing-ireland");
    expect(getRegisteredSource("USEventing")?.id).toBe("usea");
    expect(getRegisteredSource("FISE")?.id).toBe("italy-eventing");
    expect(getRegisteredSource("EA")?.id).toBe("equestrian-australia");
    expect(getRegisteredSource("equiratings")?.lifecycleStatus).toBe("registered");
  });

  it("registers provider delegation targets", () => {
    expect(listRegisteredProviders().map((provider) => provider.id)).toEqual(expect.arrayContaining(["nominate", "event-secretary", "startbox", "evententries"]));
    expect(detectProvider({ resultUrl: "https://nominate.com.au/Scoreboard/results/" })?.id).toBe("nominate");
  });

  it("maps multilingual labels with source metadata", () => {
    expect(mapSourceLabel("éliminé", "fr")?.canonicalValue).toBe("eliminated");
    expect(mapSourceLabel("ritirato", "it")?.canonicalValue).toBe("retired");
    expect(mapSourceLabel("saut d'obstacles", "fr")?.canonicalValue).toBe("showjumping");
  });
});
