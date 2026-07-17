import type { CompetitionDataConnector } from "./types";

export class ConnectorRegistry {
  private readonly connectors = new Map<string, CompetitionDataConnector>();

  register(connector: CompetitionDataConnector): this {
    if (this.connectors.has(connector.descriptor.id)) {
      throw new Error(`Connector "${connector.descriptor.id}" is already registered.`);
    }

    this.connectors.set(connector.descriptor.id, connector);
    return this;
  }

  get(connectorId: string): CompetitionDataConnector | undefined {
    return this.connectors.get(connectorId);
  }

  require(connectorId: string): CompetitionDataConnector {
    const connector = this.get(connectorId);
    if (!connector) {
      throw new Error(`Connector "${connectorId}" is not registered.`);
    }

    return connector;
  }

  list(options: { enabledOnly?: boolean } = {}): CompetitionDataConnector[] {
    const connectors = Array.from(this.connectors.values());
    if (!options.enabledOnly) {
      return connectors;
    }

    return connectors.filter((connector) => connector.descriptor.status === "enabled");
  }
}
