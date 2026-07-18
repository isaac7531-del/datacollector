#!/usr/bin/env node
import { Command } from "commander";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { createCliEngine } from "./engineFactory";
import { createSourceEngine, sourceIdFromCli } from "./sourceFactory";
import { inspectMappingFile, mappingProfileSchema, previewWithMapping, testMappingProfile } from "../mapping/mappingProfile";
import type { BackfillPlan } from "../domain/acquisition";

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

program.command("mapping:inspect").requiredOption("--path <path>", "Source file path").description("Inspect columns and suggest mappings").action(async (options) => {
  console.log(JSON.stringify(await inspectMappingFile(options.path), null, 2));
});

program.command("mapping:preview").requiredOption("--path <path>", "Source file path").requiredOption("--profile <profile>", "Mapping profile JSON").description("Preview normalised records").action(async (options) => {
  const profile = mappingProfileSchema.parse(JSON.parse(await readFile(options.profile, "utf8")));
  console.log(JSON.stringify(await previewWithMapping(options.path, profile), null, 2));
});

program.command("mapping:test").requiredOption("--path <path>", "Source file path").requiredOption("--profile <profile>", "Mapping profile JSON").description("Validate a mapping profile against a file").action(async (options) => {
  const profile = mappingProfileSchema.parse(JSON.parse(await readFile(options.profile, "utf8")));
  const result = await testMappingProfile(options.path, profile);
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
});

program.command("mapping:import").requiredOption("--path <path>", "Mapping profile JSON").description("Import a mapping profile into the local profile store").action(async (options) => {
  const profile = mappingProfileSchema.parse(JSON.parse(await readFile(options.path, "utf8")));
  await mkdir(".competition-data/mapping-profiles", { recursive: true });
  await writeFile(join(".competition-data/mapping-profiles", `${profile.id}.json`), JSON.stringify(profile, null, 2));
  console.log(JSON.stringify({ imported: true, profileId: profile.id }, null, 2));
});

program.command("mapping:export").requiredOption("--profile-id <profileId>", "Mapping profile id").description("Export a local mapping profile").action(async (options) => {
  const profile = JSON.parse(await readFile(join(".competition-data/mapping-profiles", `${options.profileId}.json`), "utf8"));
  console.log(JSON.stringify(profile, null, 2));
});

program.command("import:rollback-plan").requiredOption("--import-id <importId>", "Import run id").description("Generate a safe rollback plan").action(async (options) => {
  const { repository } = createCliEngine();
  const { RollbackService } = await import("../rollback/rollbackService");
  console.log(JSON.stringify(await new RollbackService(repository).plan(options.importId), null, 2));
});

program.command("import:rollback").requiredOption("--import-id <importId>", "Import run id").requiredOption("--confirm <confirm>", "Type the import id to confirm").description("Apply a safe rollback plan").action(async (options) => {
  if (options.confirm !== options.importId) {
    console.error("Rollback confirmation must match import id.");
    process.exit(1);
  }
  const { repository } = createCliEngine();
  const { RollbackService } = await import("../rollback/rollbackService");
  console.log(JSON.stringify(await new RollbackService(repository).apply(options.importId, options.confirm), null, 2));
});

program.command("outbox:retry").description("Mark pending outbox records for retry through the worker").action(() => {
  console.log(JSON.stringify({ accepted: true, action: "outbox:retry", command: "npm run worker:outbox" }, null, 2));
});

program.command("outbox:dead-letter").description("Inspect dead-letter outbox records through repository tooling").action(() => {
  console.log(JSON.stringify({ accepted: true, action: "outbox:dead-letter", note: "Use PostgreSQL repository listOutboxEvents('dead_letter') in production." }, null, 2));
});

program.command("source:list").description("List live acquisition sources").action(() => {
  const { engine } = createSourceEngine();
  console.log(JSON.stringify(engine.listConnectors().map((connector) => ({
    id: connector.id,
    name: connector.name,
    acquisitionMode: connector.acquisitionMode,
    automationLevel: connector.automationLevel,
    sourceHealthStatus: connector.sourceHealthStatus,
    accessLimitation: connector.accessLimitation
  })), null, 2));
});

program.command("source:health").option("--source <source>", "Source id").description("Check live source health").action(async (options) => {
  const { engine } = createSourceEngine();
  const connectors = options.source ? [sourceIdFromCli(options.source)] : engine.listConnectors().map((connector) => connector.id);
  const health = [];
  for (const connectorId of connectors) health.push(await engine.connectorHealth(connectorId));
  console.log(JSON.stringify(health, null, 2));
});

program.command("source:discover").requiredOption("--source <source>", "Source id").option("--url <url>", "Specific source URL").description("Discover events from a live source").action(async (options) => {
  const { engine } = createSourceEngine();
  const connectorId = sourceIdFromCli(options.source);
  const items = await engine.discover({ sourceIds: options.url ? [options.url] : undefined }, [connectorId]);
  console.log(JSON.stringify(items, null, 2));
});

program.command("source:collect-event").requiredOption("--source <source>", "Source id").requiredOption("--event-id <eventId>", "Event id or URL").description("Collect one source event").action(async (options) => {
  const { engine } = createSourceEngine();
  const connectorId = sourceIdFromCli(options.source);
  const items = await engine.discover({ sourceIds: options.eventId.startsWith("http") ? [options.eventId] : undefined }, [connectorId]);
  const item = items.find((candidate) => candidate.id === options.eventId || candidate.url === options.eventId) ?? items[0];
  if (!item) throw new Error(`No event found for ${options.eventId}`);
  const summary = await engine.runConnector(connectorId, { discovery: { sourceIds: [item.url ?? options.eventId] }, triggerType: "cli" });
  console.log(JSON.stringify(summary, null, 2));
});

program.command("source:smoke").requiredOption("--source <source>", "Source id").description("Run a small live source smoke test").action(async (options) => {
  const { engine } = createSourceEngine();
  const connectorId = sourceIdFromCli(options.source);
  const summary = await engine.runConnector(connectorId, { triggerType: "cli", dryRun: true });
  console.log(JSON.stringify({ source: connectorId, smoke: "completed", summary }, null, 2));
});

program.command("backfill:plan").requiredOption("--source <source>", "Source id").requiredOption("--from <from>", "From date").requiredOption("--to <to>", "To date").option("--dry-run", "Dry run", true).description("Create a controlled backfill plan").action((options) => {
  const plan: BackfillPlan = {
    id: `plan-${sourceIdFromCli(options.source)}-${options.from}-${options.to}`,
    source: sourceIdFromCli(options.source),
    fromDate: options.from,
    toDate: options.to,
    concurrency: 1,
    requestsPerMinute: 10,
    dryRun: options.dryRun !== false,
    estimatedEvents: 10,
    estimatedDocuments: 50,
    estimatedStorageBytes: 25 * 1024 * 1024,
    status: "planned"
  };
  console.log(JSON.stringify(plan, null, 2));
});

for (const command of ["backfill:start", "backfill:pause", "backfill:resume"]) {
  program.command(command).requiredOption("--plan-id <planId>", "Backfill plan id").action((options) => {
    console.log(JSON.stringify({ accepted: true, action: command, planId: options.planId }, null, 2));
  });
}

program.command("worker").description("Start the worker").action(async () => {
  await import("../workers/worker");
});

program.command("demo").description("Run the synthetic end-to-end demo").action(async () => {
  await import("../demo/runDemo");
});

void program.parseAsync(process.argv);
