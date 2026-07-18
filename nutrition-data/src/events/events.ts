import type { FeedProduct, Recommendation } from "../domain/types";

export type NutritionDataEvent =
  | { type: "nutrition.product.updated"; occurredAt: string; product: FeedProduct }
  | { type: "nutrition.product.discontinued"; occurredAt: string; product: FeedProduct }
  | { type: "nutrition.formulation.changed"; occurredAt: string; product: FeedProduct; changedNutrients: string[] }
  | { type: "nutrition.feed.unavailable"; occurredAt: string; product: FeedProduct; country?: string; region?: string }
  | { type: "nutrition.country_availability.changed"; occurredAt: string; product: FeedProduct }
  | { type: "nutrition.recommendations.changed"; occurredAt: string; recommendations: Recommendation[] };

export interface EventPublisher {
  publish(event: NutritionDataEvent): Promise<void> | void;
}

export class InMemoryEventPublisher implements EventPublisher {
  readonly events: NutritionDataEvent[] = [];

  publish(event: NutritionDataEvent): void {
    this.events.push(event);
  }
}

export const noopEventPublisher: EventPublisher = {
  publish() {
    return undefined;
  }
};
