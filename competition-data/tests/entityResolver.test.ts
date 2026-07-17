import { describe, expect, it } from "vitest";
import { EntityResolver } from "../src/resolution/entityResolver";
import type { Competition } from "../src/domain/types";

describe("EntityResolver", () => {
  it("updates when source identifiers match", () => {
    const resolver = new EntityResolver();
    const incoming: Competition = {
      externalIds: [{ sourceSystem: "fei", sourceId: "123" }],
      name: "FEI Jumping World Cup",
      status: "completed"
    };
    const existing: Competition = {
      id: "competition-1",
      externalIds: [{ sourceSystem: "fei", sourceId: "123" }],
      name: "Old name",
      status: "scheduled"
    };

    const result = resolver.resolve({
      incoming,
      candidates: [{ entity: existing, externalIds: existing.externalIds }],
      externalIds: incoming.externalIds,
      name: incoming.name
    });

    expect(result.action).toBe("update");
    expect(result.match).toBe(existing);
  });

  it("creates when candidates are below threshold", () => {
    const resolver = new EntityResolver();
    const incoming: Competition = {
      externalIds: [{ sourceSystem: "national", sourceId: "abc" }],
      name: "Sydney Dressage Classic",
      status: "completed"
    };
    const existing: Competition = {
      id: "competition-1",
      externalIds: [{ sourceSystem: "fei", sourceId: "999" }],
      name: "Melbourne Showjumping Classic",
      status: "completed"
    };

    const result = resolver.resolve({
      incoming,
      candidates: [{ entity: existing, externalIds: existing.externalIds }],
      externalIds: incoming.externalIds,
      name: incoming.name
    });

    expect(result.action).toBe("create");
  });
});
