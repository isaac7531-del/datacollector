import { createPostgresRepositories, noopLogger, type EventPublisher } from "../index";

export interface OutboxWorkerOptions {
  publisher?: EventPublisher;
  maxAttempts?: number;
  once?: boolean;
  intervalMs?: number;
}

export async function runOutboxWorker(options: OutboxWorkerOptions = {}): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the outbox worker.");
  }

  const repository = createPostgresRepositories({ connectionString: databaseUrl });
  const publisher = options.publisher ?? { publish: async () => undefined };
  const maxAttempts = options.maxAttempts ?? Number(process.env.COMPETITION_DATA_OUTBOX_MAX_ATTEMPTS ?? 5);

  const processOnce = async () => {
    const pending = await repository.listOutboxEvents("pending");
    for (const item of pending) {
      try {
        await publisher.publish(item.payload);
        await repository.markOutboxDelivered(item.id);
      } catch (error) {
        await repository.markOutboxFailed(
          item.id,
          error instanceof Error ? error.message : "Unknown outbox delivery error",
          item.retryCount + 1 >= maxAttempts
        );
      }
    }
  };

  try {
    await processOnce();
    if (options.once) {
      await repository.pool.end();
      return;
    }
    const interval = setInterval(() => void processOnce(), options.intervalMs ?? Number(process.env.COMPETITION_DATA_OUTBOX_INTERVAL_MS ?? 30_000));
    const shutdown = async () => {
      clearInterval(interval);
      await repository.pool.end();
      process.exit(0);
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    noopLogger.error("Outbox worker failed", { error: error instanceof Error ? error.message : "Unknown error" });
    await repository.pool.end();
    throw error;
  }
}

if (require.main === module) {
  runOutboxWorker({ once: process.env.COMPETITION_DATA_OUTBOX_ONCE === "true" }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
