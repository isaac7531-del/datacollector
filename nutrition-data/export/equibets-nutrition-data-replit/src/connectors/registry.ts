import type { ConnectorDescriptor, NutritionDataConnector } from "./types";

export class ConnectorRegistry {
  private readonly connectors = new Map<string, NutritionDataConnector>();

  register(connector: NutritionDataConnector): void {
    if (this.connectors.has(connector.descriptor.id)) {
      throw new Error(`Connector already registered: ${connector.descriptor.id}`);
    }
    this.connectors.set(connector.descriptor.id, connector);
  }

  list(options: { enabledOnly?: boolean } = {}): NutritionDataConnector[] {
    const connectors = Array.from(this.connectors.values());
    if (!options.enabledOnly) return connectors;
    return connectors.filter((connector) => connector.descriptor.status === "enabled");
  }

  descriptors(options: { enabledOnly?: boolean } = {}): ConnectorDescriptor[] {
    return this.list(options).map((connector) => connector.descriptor);
  }

  get(id: string): NutritionDataConnector | undefined {
    return this.connectors.get(id);
  }

  require(id: string): NutritionDataConnector {
    const connector = this.get(id);
    if (!connector) throw new Error(`Unknown nutrition connector: ${id}`);
    return connector;
  }
}
