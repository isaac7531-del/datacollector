import type { CompetitionDataConnector, DiscoveryContext } from "../connectors/types";
import { DisabledConnectorError } from "../connectors/types";
import type { ConnectorRegistry } from "../connectors/registry";
import type { DiscoveryItem } from "../domain/types";
import type { Logger } from "../adapters/logger";
import { noopLogger } from "../adapters/logger";

export interface DiscoveryServiceOptions {
  registry: ConnectorRegistry;
  logger?: Logger;
}

export class DiscoveryService {
  private readonly logger: Logger;

  constructor(private readonly options: DiscoveryServiceOptions) {
    this.logger = options.logger ?? noopLogger;
  }

  async discover(context: DiscoveryContext = {}, connectorIds?: string[]): Promise<DiscoveryItem[]> {
    const connectors = this.selectConnectors(connectorIds);
    const items: DiscoveryItem[] = [];

    for (const connector of connectors) {
      try {
        const discovered = await connector.discover(context);
        items.push(
          ...discovered.map((item) => ({
            ...item,
            connectorId: item.connectorId || connector.descriptor.id
          }))
        );
        this.logger.info("Competition discovery completed", {
          connectorId: connector.descriptor.id,
          discovered: discovered.length
        });
      } catch (error) {
        if (error instanceof DisabledConnectorError) {
          this.logger.info("Competition discovery skipped disabled connector", {
            connectorId: connector.descriptor.id
          });
          continue;
        }

        throw error;
      }
    }

    return items;
  }

  private selectConnectors(connectorIds?: string[]): CompetitionDataConnector[] {
    if (connectorIds?.length) {
      return connectorIds.map((connectorId) => this.options.registry.require(connectorId));
    }

    return this.options.registry.list({ enabledOnly: true });
  }
}
