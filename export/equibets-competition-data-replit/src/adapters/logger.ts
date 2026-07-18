export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export const noopLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined
};

export class ConsoleLogger implements Logger {
  constructor(private readonly redactKeys: string[] = []) {}

  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(message, redact(context ?? {}, this.redactKeys));
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(message, redact(context ?? {}, this.redactKeys));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(message, redact(context ?? {}, this.redactKeys));
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(message, redact(context ?? {}, this.redactKeys));
  }
}

function redact(value: unknown, redactKeys: string[]): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, redactKeys));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      redactKeys.some((redactKey) => redactKey.toLocaleLowerCase("en") === key.toLocaleLowerCase("en")) ? "[REDACTED]" : redact(nested, redactKeys)
    ])
  );
}
