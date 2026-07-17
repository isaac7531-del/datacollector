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
  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(message, context ?? {});
  }

  info(message: string, context?: Record<string, unknown>): void {
    console.info(message, context ?? {});
  }

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(message, context ?? {});
  }

  error(message: string, context?: Record<string, unknown>): void {
    console.error(message, context ?? {});
  }
}
