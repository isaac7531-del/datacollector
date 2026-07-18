export class RobotsTxtPolicy {
  private readonly disallow: string[];

  constructor(text: string) {
    this.disallow = parseWildcardDisallow(text);
  }

  allows(url: string): boolean {
    const path = new URL(url).pathname;
    return !this.disallow.some((rule) => rule !== "" && path.startsWith(rule));
  }
}

export async function fetchRobotsPolicy(origin: string, fetchImpl: typeof fetch = fetch): Promise<RobotsTxtPolicy> {
  try {
    const url = new URL("/robots.txt", origin).toString();
    const response = await fetchImpl(url, { headers: { "user-agent": "@equibets/nutrition-data/0.1.0" } });
    if (!response.ok) return new RobotsTxtPolicy("");
    return new RobotsTxtPolicy(await response.text());
  } catch {
    return new RobotsTxtPolicy("");
  }
}

function parseWildcardDisallow(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const rules: string[] = [];
  let appliesToWildcard = false;
  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const [keyRaw, ...rest] = line.split(":");
    const key = keyRaw?.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") appliesToWildcard = value === "*";
    if (appliesToWildcard && key === "disallow") rules.push(value);
    if (key === "user-agent" && value !== "*") appliesToWildcard = false;
  }
  return rules;
}
