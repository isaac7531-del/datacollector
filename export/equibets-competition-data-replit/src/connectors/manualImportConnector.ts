import { createHash } from "crypto";
import type { DataSource, DiscoveryItem, ManualEntrySubmission, NormalizedCompetitionGraph, RawCompetitionPayload } from "../domain/types";
import type { CollectionContext, CompetitionDataConnector, ConnectorDescriptor, DiscoveryContext } from "./types";
import { DisabledConnectorError } from "./types";

export interface ManualImportConnectorOptions {
  id?: string;
  enabled: boolean;
  submissions: ManualEntrySubmission[];
}

export function createManualImportConnector(options: ManualImportConnectorOptions): CompetitionDataConnector {
  const connectorId = options.id ?? "manual-import";
  const source: DataSource = {
    id: connectorId,
    name: "Manual import",
    kind: "user_entry",
    mode: "manual",
    official: false
  };
  const descriptor: ConnectorDescriptor = {
    id: connectorId,
    name: "Manual import connector",
    status: options.enabled ? "enabled" : "disabled",
    source,
    sourceOrganisation: "EquiBets users",
    supportedRecordTypes: ["event", "class", "entry", "result", "phase_result", "horse", "rider", "ranking"],
    sourceAuthority: "user_unverified",
    collectionMethod: "manual",
    supportsBackfill: false,
    resultsMayBeProvisional: true,
    requiresHumanReview: true,
    capabilities: ["discover", "fetchResults", "stage"],
    complianceNote: "Manual imports use the same staging, validation, provenance, resolution, and reconciliation path as public imports."
  };

  return {
    descriptor,
    async discover(_context: DiscoveryContext): Promise<DiscoveryItem[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      return options.submissions.map((submission, index) => ({
        id: `manual-${submission.submittedAt}-${index + 1}`,
        connectorId,
        source,
        label: submission.competition.name
      }));
    },
    async collect(item: DiscoveryItem, _context: CollectionContext): Promise<RawCompetitionPayload[]> {
      if (descriptor.status === "disabled") throw new DisabledConnectorError(connectorId);
      const index = Number(item.id.split("-").at(-1) ?? "1") - 1;
      const submission = options.submissions[index];
      if (!submission) throw new Error(`Manual submission not found for ${item.id}.`);
      const graph: NormalizedCompetitionGraph = {
        competition: submission.competition,
        events: submission.events ?? [],
        horses: submission.horses ?? [],
        riders: submission.riders ?? [],
        results: submission.results ?? [],
        entries: submission.entries ?? [],
        rankings: submission.rankings ?? [],
        provenance: [
          {
            source,
            connectorId,
            fetchedAt: submission.submittedAt,
            licenceNote: submission.sourceNote,
            rawRecordId: item.id
          }
        ],
        issues: []
      };

      return [
        {
          connectorId,
          source,
          fetchedAt: submission.submittedAt,
          data: [graph],
          contentType: "application/vnd.equibets.normalized-graph+json",
          rawRecordId: item.id,
          checksum: createHash("sha256").update(JSON.stringify(submission)).digest("hex")
        }
      ];
    }
  };
}
