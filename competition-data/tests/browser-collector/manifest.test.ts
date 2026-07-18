import { describe, expect, it } from "vitest";
import manifest from "../../browser-collector/manifest.json";

describe("browser collector manifest", () => {
  it("is limited to data.fei.org and has no bypass permissions", () => {
    expect(manifest.host_permissions).toEqual(["https://data.fei.org/*"]);
    expect(manifest.permissions).not.toContain("proxy");
    expect(manifest.permissions).not.toContain("webRequestBlocking");
  });
});
