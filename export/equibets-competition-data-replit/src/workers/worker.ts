import { createCliEngine } from "../cli/engineFactory";
import { SchedulerLockService } from "../scheduling/locks";

export interface WorkerOptions {
  intervalMs?: number;
  lockTtlMs?: number;
  once?: boolean;
}

export async function runWorker(options: WorkerOptions = {}): Promise<void> {
  const { engine, repository } = createCliEngine();
  const locks = new SchedulerLockService(repository);

  const runOnce = async () => {
    await locks.withLock("worker:all-enabled", options.lockTtlMs ?? 15 * 60_000, async () => {
      const connectors = engine.listConnectors({ enabledOnly: true });
      for (const connector of connectors) {
        try {
          await engine.runConnector(connector.id, { triggerType: "worker" });
        } catch (error) {
          console.error(JSON.stringify({ connectorId: connector.id, error: error instanceof Error ? error.message : "Unknown error" }));
        }
      }
    });
  };

  await runOnce();

  if (options.once) {
    return;
  }

  const interval = setInterval(() => {
    void runOnce();
  }, options.intervalMs ?? Number(process.env.COMPETITION_DATA_WORKER_INTERVAL_MS ?? 300_000));

  const shutdown = () => {
    clearInterval(interval);
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

if (require.main === module) {
  void runWorker();
}
