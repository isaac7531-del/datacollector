import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { OperationalEntityResolver, type ResolvableEntityType } from "../../src";
import type { SourceIdentifier } from "../../src";

interface BenchmarkCase {
  label: string;
  entityType: ResolvableEntityType;
  incoming: { externalIds: SourceIdentifier[]; name?: string; displayName?: string; countryCode?: string; yearOfBirth?: number };
  candidate: { externalIds: SourceIdentifier[]; name?: string; displayName?: string; countryCode?: string; yearOfBirth?: number };
  expected: "create" | "update" | "review";
}

describe("OperationalEntityResolver", () => {
  it("runs the labelled synthetic benchmark and reports regression precision/recall", () => {
    const cases = JSON.parse(readFileSync(join(process.cwd(), "tests/fixtures/entity-resolution-benchmark.json"), "utf8")) as BenchmarkCase[];
    const resolver = new OperationalEntityResolver({
      horse: { update: 0.82, review: 0.42 },
      rider: { update: 0.82, review: 0.5 },
      default: { update: 0.82, review: 0.58 }
    });
    let correct = 0;
    for (const testCase of cases) {
      const result = resolver.resolve({
        entityType: testCase.entityType,
        incoming: testCase.incoming,
        candidates: [{ entity: testCase.candidate, externalIds: testCase.candidate.externalIds }],
        externalIds: testCase.incoming.externalIds,
        name: testCase.incoming.name ?? testCase.incoming.displayName,
        countryCode: testCase.incoming.countryCode,
        yearOfBirth: testCase.incoming.yearOfBirth
      });
      if (result.action === testCase.expected) correct += 1;
      expect(result.action, testCase.label).toBe(testCase.expected);
      expect(result.reasons.length).toBeGreaterThan(0);
    }
    const precision = correct / cases.length;
    const recall = precision;
    expect({ precision, recall }).toEqual({ precision: 1, recall: 1 });
  });

  it("remembers rejected matches", () => {
    const resolver = new OperationalEntityResolver({ horse: { update: 0.5, review: 0.2 } });
    resolver.reject("source:incoming", "source:candidate");
    const result = resolver.resolve({
      entityType: "horse",
      incoming: { name: "Rejected Horse" },
      candidates: [{ entity: { name: "Rejected Horse" }, externalIds: [{ sourceSystem: "source", sourceId: "candidate" }] }],
      externalIds: [{ sourceSystem: "source", sourceId: "incoming" }],
      name: "Rejected Horse"
    });
    expect(result.action).toBe("create");
  });
});
