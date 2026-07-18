import type { CollectionContext, CompetitionDataConnector, ConnectorDescriptor, DiscoveryContext } from "./types";
import type { DiscoveryItem, RawCompetitionPayload } from "../domain/types";
import type { RegisteredSource } from "../sources/sourceRegistry";

export class UnsupportedSourceCapabilityError extends Error {
  constructor(readonly sourceId: string, readonly capability: string, readonly status: string, readonly blocker?: string) {
    super(`${sourceId}.${capability} is ${status}${blocker ? `: ${blocker}` : ""}`);
    this.name = "UnsupportedSourceCapabilityError";
  }
}

export function createScaffoldConnector(source: RegisteredSource): CompetitionDataConnector {
  const descriptor: ConnectorDescriptor = {
    id: source.id,
    name: `${source.organisation} connector scaffold`,
    status: source.lifecycleStatus === "disabled" ? "disabled" : "enabled",
    source: {
      id: source.id,
      name: source.organisation,
      kind: source.id === "fei" ? "fei" : "national_federation",
      mode: source.acquisitionMode === "file" ? "official_export" : "public_page",
      official: true,
      sourceUrl: source.publicEntryPoints[0]
    },
    sourceOrganisation: source.organisation,
    acquisitionMode: source.acquisitionMode,
    automationLevel: source.automationLevel,
    accessLimitation: source.currentBlockers.join("; ") || undefined,
    requiredUserAction: source.operatorActionRequired,
    sourceHealthStatus: source.lifecycleStatus === "blocked" ? "degraded" : "unknown",
    capabilities: ["discover", "healthCheck"],
    complianceNote: "Registered scaffold. Capabilities return explicit unsupported/assisted statuses until production implementation is completed."
  };
  return {
    descriptor,
    async discover(_context: DiscoveryContext): Promise<DiscoveryItem[]> {
      throw capabilityError(source, "discoverRecentEvents");
    },
    async collect(_item: DiscoveryItem, _context: CollectionContext): Promise<RawCompetitionPayload[]> {
      throw capabilityError(source, "fetchFinalResults");
    },
    async healthCheck() {
      return {
        connectorId: source.id,
        status: descriptor.sourceHealthStatus ?? "unknown",
        checkedAt: new Date().toISOString(),
        consecutiveFailures: source.lifecycleStatus === "blocked" ? 1 : 0,
        message: descriptor.accessLimitation
      };
    }
  };
}

function capabilityError(source: RegisteredSource, capability: string): UnsupportedSourceCapabilityError {
  const status = source.capabilities.find((item) => item.capability === capability)?.status ?? "unsupported";
  return new UnsupportedSourceCapabilityError(source.id, capability, status, source.currentBlockers.join("; ") || undefined);
}
