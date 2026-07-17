import type { IngestionEngine, IngestionRunOptions } from "../ingestion/ingestionEngine";

export interface ScheduleDefinition {
  id: string;
  connectorIds?: string[];
  intervalMs: number;
  runOptions?: Omit<IngestionRunOptions, "connectorIds">;
  enabled: boolean;
}

export interface ScheduledJobHandle {
  id: string;
  stop(): void;
}

export interface CompetitionDataScheduler {
  start(schedule: ScheduleDefinition): ScheduledJobHandle;
  stopAll(): void;
}

export class InProcessCompetitionDataScheduler implements CompetitionDataScheduler {
  private readonly jobs = new Map<string, NodeJS.Timeout>();

  constructor(private readonly engine: IngestionEngine) {}

  start(schedule: ScheduleDefinition): ScheduledJobHandle {
    if (!schedule.enabled) {
      return {
        id: schedule.id,
        stop: () => undefined
      };
    }

    if (this.jobs.has(schedule.id)) {
      throw new Error(`Schedule "${schedule.id}" is already running.`);
    }

    const run = async () => {
      await this.engine.run({
        ...schedule.runOptions,
        connectorIds: schedule.connectorIds
      });
    };

    const timer = setInterval(() => {
      void run();
    }, schedule.intervalMs);

    this.jobs.set(schedule.id, timer);

    return {
      id: schedule.id,
      stop: () => {
        const activeTimer = this.jobs.get(schedule.id);
        if (activeTimer) {
          clearInterval(activeTimer);
          this.jobs.delete(schedule.id);
        }
      }
    };
  }

  stopAll(): void {
    for (const timer of this.jobs.values()) {
      clearInterval(timer);
    }
    this.jobs.clear();
  }
}
