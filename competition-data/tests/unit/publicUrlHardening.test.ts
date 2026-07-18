import { describe, expect, it } from "vitest";
import { assertSafePublicUrl, isBlockedAddress } from "../../src";

describe("public URL hardening", () => {
  it("enforces allowlists and unsupported schemes", async () => {
    await expect(assertSafePublicUrl("ftp://example.com/results.csv")).rejects.toThrow(/Unsupported/);
    await expect(assertSafePublicUrl("http://example.com/results.csv", { allowedHosts: ["allowed.example"] })).rejects.toThrow(/not allowlisted/);
  });

  it("classifies blocked address ranges used during redirects and DNS checks", () => {
    expect(isBlockedAddress("127.0.0.1")).toBe(true);
    expect(isBlockedAddress("::1")).toBe(true);
    expect(isBlockedAddress("10.1.2.3")).toBe(true);
    expect(isBlockedAddress("172.16.0.1")).toBe(true);
    expect(isBlockedAddress("192.168.1.1")).toBe(true);
    expect(isBlockedAddress("169.254.169.254")).toBe(true);
    expect(isBlockedAddress("8.8.8.8")).toBe(false);
  });
});
