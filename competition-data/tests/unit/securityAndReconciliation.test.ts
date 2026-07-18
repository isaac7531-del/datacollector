import { describe, expect, it } from "vitest";
import {
  ConflictService,
  InMemoryCompetitionDataRepository,
  SourceAuthorityPolicy,
  assertSafePublicUrl,
  createResultDuplicateFingerprint,
  isBlockedAddress,
  type CompetitionResult
} from "../../src";

describe("security and reconciliation utilities", () => {
  it("blocks SSRF-sensitive addresses", async () => {
    expect(isBlockedAddress("127.0.0.1")).toBe(true);
    expect(isBlockedAddress("10.0.0.5")).toBe(true);
    expect(isBlockedAddress("169.254.169.254")).toBe(true);
    await expect(assertSafePublicUrl("http://localhost/results.csv")).rejects.toThrow(/Blocked/);
    await expect(assertSafePublicUrl("file:///tmp/results.csv")).rejects.toThrow(/Unsupported/);
  });

  it("scores source authority using configurable rules", () => {
    const policy = new SourceAuthorityPolicy();
    expect(policy.score({ tier: "international_federation_final", publicationStatus: "final" })).toBe(100);
    expect(policy.score({ tier: "user_unverified" })).toBe(20);
  });

  it("creates duplicate fingerprints and conflict records", async () => {
    const repository = new InMemoryCompetitionDataRepository();
    const result: CompetitionResult = {
      externalIds: [{ sourceSystem: "source", sourceId: "1" }],
      horseName: "Horse",
      riderName: "Rider",
      score: 30,
      placing: 1,
      status: "placed"
    };
    expect(createResultDuplicateFingerprint({ result })).toHaveLength(64);

    const conflicts = new ConflictService(repository);
    const conflict = await conflicts.detect({
      entityType: "result",
      fieldPath: "score",
      incomingValue: 31,
      existingValue: 30,
      sourceReferences: []
    });
    expect(conflict?.status).toBe("open");
    const resolved = await conflicts.resolve(conflict?.id ?? "", "Official correction");
    expect(resolved?.status).toBe("resolved");
  });
});
