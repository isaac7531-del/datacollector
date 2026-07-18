import { setTimeout as sleep } from "node:timers/promises";
import { createSeededEngine } from "../cli/engineFactory";

async function main(): Promise<void> {
  const intervalMs = Number(process.env.NUTRITION_WORKER_INTERVAL_MS ?? 60 * 60 * 1000);
  const once = process.env.NUTRITION_WORKER_ONCE === "1";
  const engine = await createSeededEngine();

  async function tick(): Promise<void> {
    const summary = await engine.runIngestion();
    console.log(JSON.stringify({ type: "nutrition.worker.ingestion_complete", summary, at: new Date().toISOString() }));
  }

  do {
    await tick();
    if (!once) await sleep(intervalMs);
  } while (!once);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
