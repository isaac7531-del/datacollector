import type {
  ConnectorStatus,
  DataSource,
  DiscoveryItem,
  RawCompetitionPayload
} from "../domain/types";

export interface ConnectorDescriptor {
  id: string;
  name: string;
  status: ConnectorStatus;
  source: DataSource;
  capabilities: Array<"discover" | "fetch_results" | "fetch_entries" | "fetch_rankings" | "fetch_horses" | "fetch_riders">;
  complianceNote: string;
}

export interface DiscoveryContext {
  fromDate?: string;
  toDate?: string;
  countryCodes?: string[];
  sourceIds?: string[];
  metadata?: Record<string, unknown>;
}

export interface CollectionContext {
  importBatchId: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface CompetitionDataConnector {
  descriptor: ConnectorDescriptor;
  discover(context: DiscoveryContext): Promise<DiscoveryItem[]>;
  collect(item: DiscoveryItem, context: CollectionContext): Promise<RawCompetitionPayload[]>;
}

export class DisabledConnectorError extends Error {
  constructor(connectorId: string) {
    super(`Connector "${connectorId}" is disabled.`);
    this.name = "DisabledConnectorError";
  }
}
