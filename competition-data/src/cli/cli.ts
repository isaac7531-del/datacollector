#!/usr/bin/env node
import { Command } from "commander";
import { createCliEngine } from "./engineFactory";

const program = new Command();

program.name("competition-data").description("EquiBets Competition Data Engine CLI").version("0.1.0");

program
  .command("connector:list")
  .description("List configured connectors")
  .action(() => {
    const { engine } = createCliEngine();
    console.log(JSON.stringify(engine.listConnectors(), null, 2));
  });

program
  .command("connector:health")
  .option("--connector <connector>", "Connector id")
  .description("Check connector health")
  .action(async (options) => {
    const { engine } = createCliEngine();
    const connectorIds = options.connector ? [options.connector] : engine.listConnectors().map((connector) => connector.id);
    const health = [];
    for (const connectorId of connectorIds) {
      health.push(await engine.connectorHealth(connectorId));
    }
    console.log(JSON.stringify(health, null, 2));
  });

program
  .command("import:file")
  .requiredOption("--path <path>", "CSV file path")
  .option("--connector <connector>", "Connector id", "generic-csv")
  .description("Import a local CSV file")
  .action(async (options) => {
    const { engine } = createCliEngine({ filePath: options.path, connectorId: options.connector });
    console.log(JSON.stringify(await engine.runConnector(options.connector, { triggerType: "cli" }), null, 2));
  });

program
  .command("import:url")
  .requiredOption("--url <url>", "Public file URL")
  .option("--connector <connector>", "Connector id", "public-file")
  .description("Import a public CSV/JSON/XML/XLSX URL")
  .action(async (options) => {
    const { engine } = createCliEngine({ url: options.url, connectorId: options.connector });
    console.log(JSON.stringify(await engine.runConnector(options.connector, { triggerType: "cli" }), null, 2));
  });

program
  .command("backfill")
  .requiredOption("--connector <connector>", "Connector id")
  .requiredOption("--from <from>", "From date YYYY-MM-DD")
  .requiredOption("--to <to>", "To date YYYY-MM-DD")
  .description("Backfill a connector date range")
  .action(async (options) => {
    const { engine } = createCliEngine();
    console.log(JSON.stringify(await engine.runBackfill(options.connector, options.from, options.to), null, 2));
  });

program.command("reprocess:failed").description("Report failed records pending repository-specific reprocess").action(() => {
  console.log(JSON.stringify({ accepted: true, action: "reprocess:failed", note: "Requires persistent repository integration." }, null, 2));
});

program.command("reprocess:unresolved").description("Report unresolved records pending repository-specific reprocess").action(() => {
  console.log(JSON.stringify({ accepted: true, action: "reprocess:unresolved", note: "Requires Resolution Centre integration." }, null, 2));
});

program.command("provisional:recheck").description("Recheck provisional results").action(() => {
  console.log(JSON.stringify({ accepted: true, action: "provisional:recheck", note: "Run configured provisional connectors in Replit scheduler." }, null, 2));
});

program.command("worker").description("Start the worker").action(async () => {
  await import("../workers/worker");
});

program.command("demo").description("Run the synthetic end-to-end demo").action(async () => {
  await import("../demo/runDemo");
});

void program.parseAsync(process.argv);
