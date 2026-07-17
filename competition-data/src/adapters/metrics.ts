export interface MetricsSink {
  increment(name: string, value?: number, tags?: Record<string, string>): void;
  timing(name: string, valueMs: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
}

export const noopMetrics: MetricsSink = {
  increment: () => undefined,
  timing: () => undefined,
  gauge: () => undefined
};

export interface AuditLogEntry {
  action: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  occurredAt: string;
  details?: Record<string, unknown>;
}

export interface AuditLogger {
  write(entry: AuditLogEntry): Promise<void>;
}

export const noopAuditLogger: AuditLogger = {
  write: async () => undefined
};
