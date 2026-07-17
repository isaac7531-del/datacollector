export type ErrorCategory = "validation" | "connector" | "network" | "storage" | "auth" | "conflict" | "unknown";

export class CompetitionDataError extends Error {
  constructor(
    message: string,
    readonly category: ErrorCategory,
    readonly retryable = false,
    readonly context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "CompetitionDataError";
  }
}

export function classifyError(error: unknown): CompetitionDataError {
  if (error instanceof CompetitionDataError) return error;
  if (error instanceof Error) return new CompetitionDataError(error.message, "unknown", false);
  return new CompetitionDataError("Unknown error", "unknown", false);
}
