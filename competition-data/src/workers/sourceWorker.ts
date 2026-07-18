import { createSourceEngine } from "../cli/sourceFactory";

export async function runSourceWorker(mode = process.argv[2] ?? "discovery"): Promise<void> {
  const { engine } = createSourceEngine();
  if (mode === "discovery") {
    for (const connector of engine.listConnectors({ enabledOnly: true })) {
      const items = await engine.discover({}, [connector.id]);
      console.log(JSON.stringify({ mode, connectorId: connector.id, discovered: items.length }));
    }
    return;
  }
  if (mode === "collection" || mode === "processing" || mode === "provisional" || mode === "backfill") {
    for (const connector of engine.listConnectors({ enabledOnly: true })) {
      const summary = await engine.runConnector(connector.id, { triggerType: "worker", dryRun: mode !== "collection" });
      console.log(JSON.stringify({ mode, connectorId: connector.id, summary }));
    }
    return;
  }
  throw new Error(`Unknown source worker mode: ${mode}`);
}

if (require.main === module) {
  runSourceWorker().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
