import { describe, expect, it } from "vitest";
import {
  createCompetitionDataEngine,
  createPostgresRepositories,
  connectorRegistry,
  runConnector,
  runBackfill,
  importFile,
  importPublicUrl,
  processStagedRecords,
  reconcileResult,
  submitManualResult,
  confirmResultMatch
} from "../../src";

describe("public package exports", () => {
  it("exports stable Replit integration API names", () => {
    expect(createCompetitionDataEngine).toBeTypeOf("function");
    expect(createPostgresRepositories).toBeTypeOf("function");
    expect(connectorRegistry).toBeTypeOf("function");
    expect(runConnector).toBeTypeOf("function");
    expect(runBackfill).toBeTypeOf("function");
    expect(importFile).toBeTypeOf("function");
    expect(importPublicUrl).toBeTypeOf("function");
    expect(processStagedRecords).toBeTypeOf("function");
    expect(reconcileResult).toBeTypeOf("function");
    expect(submitManualResult).toBeTypeOf("function");
    expect(confirmResultMatch).toBeTypeOf("function");
  });
});
