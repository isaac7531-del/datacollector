import type { ProviderDetectionEvidence, RegisteredProvider } from "./types";

export const registeredProviders: RegisteredProvider[] = [
  { id: "rechenstelle", name: "Rechenstelle", hostnames: ["rechenstelle.de", "www.rechenstelle.de", "live.rechenstelle.de"], capabilities: ["pdf_results", "live_results", "final_results"], status: "working" },
  { id: "british-eventing", name: "British Eventing result loader", hostnames: ["www.britisheventing.com"], capabilities: ["final_results", "live_results"], status: "working" },
  { id: "eventing-ireland-live", name: "Eventing Ireland Live Results", hostnames: ["results.eventingireland.com"], capabilities: ["live_results", "final_results"], status: "scaffolded" },
  { id: "evententries", name: "Event Entries", hostnames: ["evententries.com"], capabilities: ["entries", "live_results", "final_results"], status: "registered" },
  { id: "startbox", name: "Start Box", hostnames: ["startboxscoring.com", "eventing.startboxscoring.com"], capabilities: ["live_results", "final_results"], status: "registered" },
  { id: "equiratings-api", name: "EquiRatings Partner API", hostnames: ["eventing.documentation.equiratings.com", "www.equiratings.com"], capabilities: ["api_results"], status: "blocked", notes: "Requires partner credentials/licence." },
  { id: "ffe-compet", name: "FFE Compet", hostnames: ["ffecompet.ffe.com", "www.ffesif.com"], capabilities: ["event_search", "entries", "final_results"], status: "registered" },
  { id: "fise", name: "FISE", hostnames: ["www.fise.it"], capabilities: ["pdf_results", "final_results"], status: "registered" },
  { id: "nominate", name: "Nominate", hostnames: ["nominate.com.au", "www.nominate.com.au"], capabilities: ["event_search", "entries", "live_results", "final_results"], status: "registered" },
  { id: "event-secretary", name: "Event Secretary", hostnames: ["eventsecretary.com.au", "www.eventsecretary.com.au"], capabilities: ["entries", "live_results", "final_results"], status: "registered" }
];

export function listRegisteredProviders(): RegisteredProvider[] {
  return registeredProviders.map((provider) => ({ ...provider, hostnames: [...provider.hostnames], capabilities: [...provider.capabilities] }));
}

export function detectProvider(evidence: ProviderDetectionEvidence): RegisteredProvider | undefined {
  const hostname = evidence.hostname ?? (evidence.resultUrl ? safeHostname(evidence.resultUrl) : undefined);
  if (!hostname) return undefined;
  return listRegisteredProviders().find((provider) => provider.hostnames.some((candidate) => hostname.endsWith(candidate)));
}

function safeHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
