export type CompetitionDataEventType =
  | "competitionData.import.started"
  | "competitionData.import.completed"
  | "competitionData.import.failed"
  | "competitionData.event.created"
  | "competitionData.event.updated"
  | "competitionData.horse.created"
  | "competitionData.horse.matched"
  | "competitionData.rider.created"
  | "competitionData.rider.matched"
  | "competitionData.combination.created"
  | "competitionData.result.created"
  | "competitionData.result.updated"
  | "competitionData.result.finalised"
  | "competitionData.result.corrected"
  | "competitionData.result.withdrawn"
  | "competitionData.conflict.detected"
  | "competitionData.resolution.required"
  | "competitionData.resolution.completed"
  | "competitionData.canonicalRecord.changed"
  | "competitionData.connectorHealth.changed";

export interface CompetitionDataEvent<TPayload = unknown> {
  id: string;
  version: 1;
  type: CompetitionDataEventType;
  occurredAt: string;
  correlationId: string;
  payload: TPayload;
}

export interface EventPublisher {
  publish(event: CompetitionDataEvent): Promise<void>;
}

export class InMemoryEventPublisher implements EventPublisher {
  readonly events: CompetitionDataEvent[] = [];

  async publish(event: CompetitionDataEvent): Promise<void> {
    this.events.push(event);
  }
}

export function createCompetitionDataEvent<TPayload>(
  type: CompetitionDataEventType,
  payload: TPayload,
  correlationId: string
): CompetitionDataEvent<TPayload> {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    version: 1,
    type,
    occurredAt: new Date().toISOString(),
    correlationId,
    payload
  };
}
