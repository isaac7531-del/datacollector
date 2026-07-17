import { lookup } from "dns/promises";
import { isIP } from "net";

export interface UrlSafetyOptions {
  allowedProtocols?: string[];
  blockedHosts?: string[];
}

const DEFAULT_BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "169.254.169.254"
]);

export async function assertSafePublicUrl(urlString: string, options: UrlSafetyOptions = {}): Promise<URL> {
  const url = new URL(urlString);
  const allowedProtocols = options.allowedProtocols ?? ["http:", "https:"];
  if (!allowedProtocols.includes(url.protocol)) {
    throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  }

  const hostname = url.hostname.toLocaleLowerCase("en");
  const blockedHosts = new Set([...DEFAULT_BLOCKED_HOSTS, ...(options.blockedHosts ?? []).map((host) => host.toLocaleLowerCase("en"))]);
  if (blockedHosts.has(hostname)) {
    throw new Error(`Blocked public import host: ${hostname}`);
  }

  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  for (const address of addresses) {
    if (isBlockedAddress(address.address)) {
      throw new Error(`Blocked public import address: ${address.address}`);
    }
  }

  return url;
}

export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a = 0, b = 0] = address.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }

  if (version === 6) {
    const normalized = address.toLocaleLowerCase("en");
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80") ||
      normalized === "::" ||
      normalized.startsWith("ff")
    );
  }

  return true;
}
