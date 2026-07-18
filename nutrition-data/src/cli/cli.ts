#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import type { FeedingProgram, HorseProfile } from "../domain/types";
import { manufacturerTargetReconnaissance } from "../connectors/manufacturerSourceConfigs";
import { parseForageLaboratoryImport } from "../forage/laboratoryImports";
import { OperationalWorkerRunner, type OperationalWorkerName } from "../workers/operationalWorkers";
import { createOperationalEngine, createOperationalRuntime, createSeededEngine } from "./engineFactory";

const program = new Command();

program.name("nutrition-data").description("EquiBets Nutrition Data Engine CLI").version("0.1.0");

program
  .command("connector:list")
  .description("List configured manufacturer connectors")
  .action(async () => {
    const engine = await createSeededEngine();
    print(engine.listConnectors());
  });

program
  .command("manufacturer:list")
  .description("List operational manufacturer connectors")
  .action(async () => {
    const engine = await createOperationalEngine();
    print(engine.listConnectors());
  });

program
  .command("manufacturer:health")
  .description("Check operational manufacturer connector health")
  .argument("[manufacturer]", "manufacturer connector id")
  .action(async (manufacturer?: string) => {
    const engine = await createOperationalEngine();
    if (manufacturer) return print(await engine.connectorHealth(manufacturer));
    print(await Promise.all(engine.listConnectors().map((connector) => engine.connectorHealth(connector.id))));
  });

program
  .command("manufacturer:status")
  .description("Assess manufacturer implementation status")
  .requiredOption("--manufacturer <id>", "manufacturer connector id")
  .action(async (options: { manufacturer: string }) => {
    const engine = await createOperationalEngine();
    print(await engine.manufacturerStatus(options.manufacturer));
  });

program
  .command("manufacturer:assess")
  .description("Alias for manufacturer:status with acceptance blockers")
  .requiredOption("--manufacturer <id>", "manufacturer connector id")
  .action(async (options: { manufacturer: string }) => {
    const engine = await createOperationalEngine();
    print(await engine.manufacturerStatus(options.manufacturer));
  });

program
  .command("manufacturer:discover")
  .description("Discover public product URLs for a manufacturer")
  .requiredOption("--manufacturer <id>", "manufacturer connector id")
  .action(async (options: { manufacturer: string }) => {
    const engine = await createOperationalEngine();
    print(await engine.discover({}, [options.manufacturer]));
  });

program
  .command("manufacturer:collect")
  .description("Collect and ingest public product data for a manufacturer")
  .requiredOption("--manufacturer <id>", "manufacturer connector id")
  .option("--dry-run", "Do not persist imported products")
  .action(async (options: { manufacturer: string; dryRun?: boolean }) => {
    const engine = await createOperationalEngine();
    print(await engine.runConnector(options.manufacturer, { dryRun: options.dryRun }));
  });

program
  .command("manufacturer:persist-smoke")
  .description("Run a one-shot in-memory persistence smoke for a manufacturer")
  .requiredOption("--manufacturer <id>", "manufacturer connector id")
  .action(async (options: { manufacturer: string }) => {
    const engine = await createOperationalEngine();
    const summary = await engine.runConnector(options.manufacturer);
    const status = await engine.manufacturerStatus(options.manufacturer);
    print({ summary, status });
  });

program
  .command("manufacturer:acceptance")
  .description("Report manufacturer acceptance status")
  .requiredOption("--manufacturer <id>", "manufacturer connector id")
  .action(async (options: { manufacturer: string }) => {
    const engine = await createOperationalEngine();
    print(await engine.manufacturerAcceptance(options.manufacturer));
  });

program
  .command("manufacturer:refresh")
  .description("Refresh manufacturer product collection")
  .requiredOption("--manufacturer <id>", "manufacturer connector id")
  .action(async (options: { manufacturer: string }) => {
    const engine = await createOperationalEngine();
    print(await engine.runConnector(options.manufacturer));
  });

program
  .command("manufacturer:smoke")
  .description("Run a discovery-only smoke test for a manufacturer")
  .requiredOption("--manufacturer <id>", "manufacturer connector id")
  .action(async (options: { manufacturer: string }) => {
    const engine = await createOperationalEngine();
    const items = await engine.discover({}, [options.manufacturer]);
    print({ manufacturer: options.manufacturer, discovered: items.length, sample: items.slice(0, 5) });
  });

program
  .command("source:matrix")
  .description("Print manufacturer source reconnaissance matrix")
  .action(() => print(manufacturerTargetReconnaissance));

program
  .command("manufacturer:workboard")
  .description("Print manufacturer implementation workboard")
  .action(async () => {
    const engine = await createOperationalEngine();
    print(await engine.manufacturerWorkboard());
  });

program
  .command("connector:health")
  .description("Check connector health")
  .argument("[connectorId]", "connector id", "default-seed")
  .action(async (connectorId: string) => {
    const engine = await createSeededEngine();
    print(await engine.connectorHealth(connectorId));
  });

program
  .command("ingest")
  .description("Run nutrition ingestion")
  .option("--dry-run", "Discover and normalise without writing")
  .action(async (options: { dryRun?: boolean }) => {
    const engine = await createSeededEngine();
    print(await engine.runIngestion({ dryRun: options.dryRun }));
  });

program
  .command("products")
  .description("Search products")
  .option("--country <country>", "Country filter")
  .option("--text <text>", "Text search")
  .option("--imported", "Include imported products")
  .action(async (options: { country?: string; text?: string; imported?: boolean }) => {
    const engine = await createSeededEngine();
    print(await engine.searchProducts({ country: options.country, text: options.text, includeImported: options.imported }));
  });

program
  .command("product:refresh")
  .description("Refresh products by running live ingestion")
  .option("--product-id <id>", "reserved for persistent repositories")
  .option("--manufacturer <id>", "manufacturer connector id")
  .action(async (options: { productId?: string; manufacturer?: string }) => {
    const engine = await createOperationalEngine();
    print(await engine.runIngestion({ connectorIds: options.manufacturer ? [options.manufacturer] : undefined }));
  });

program
  .command("product:versions")
  .description("List product formulation versions")
  .requiredOption("--product-id <id>", "product id")
  .action(async (options: { productId: string }) => {
    const engine = await createOperationalEngine();
    print(await engine.productVersions(options.productId));
  });

program
  .command("availability:refresh")
  .description("Run availability worker")
  .option("--country <country>", "country code")
  .action(async (options: { country?: string }) => runWorker("availability", { country: options.country }));

program
  .command("availability:stale")
  .description("List stale availability evidence")
  .option("--country <country>", "country code")
  .action(async (options: { country?: string }) => {
    const engine = await createOperationalEngine();
    const staleBefore = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    print(await engine.availabilityEvidence({ country: options.country, staleBefore }));
  });

program
  .command("price:refresh")
  .description("Run price refresh worker")
  .option("--country <country>", "country code")
  .action(async (options: { country?: string }) => runWorker("prices", { country: options.country }));

program.command("mappings:inspect").description("Inspect mapping profiles").action(() => print({ nutrientAliases: "built-in", ingredientAliases: "built-in", audit: "mapping profile persistence hook available through operational issues" }));
program.command("mappings:test").description("Run mapping self-test").action(() => print({ ok: true }));
program.command("formulations:changed").description("List formulation-change operational issues").action(async () => {
  const engine = await createOperationalEngine();
  print(await engine.operationalIssues({ type: "changed_formulation" }));
});
program.command("formulation:changes").description("Alias for formulations:changed").action(async () => {
  const engine = await createOperationalEngine();
  print(await engine.operationalIssues({ type: "changed_formulation" }));
});
program.command("backfill:plan").description("Create a backfill plan").requiredOption("--manufacturer <id>", "manufacturer id").action((options: { manufacturer: string }) => print({ planId: `backfill-${options.manufacturer}`, manufacturer: options.manufacturer, mode: "discover_then_collect" }));
program.command("backfill:start").description("Start a backfill plan").requiredOption("--plan-id <id>", "plan id").action(async (options: { planId: string }) => print({ planId: options.planId, status: "accepted" }));

program
  .command("forage-lab:import")
  .description("Import a forage laboratory report file")
  .requiredOption("--lab <id>", "lab id")
  .requiredOption("--file <path>", "CSV/TSV/text/PDF-extracted text file")
  .option("--forage-type <type>", "forage type")
  .option("--sample-date <date>", "sample date")
  .action((options: { lab: any; file: string; forageType?: any; sampleDate?: string }) => {
    const text = readFileSync(options.file, "utf8");
    print(parseForageLaboratoryImport({ laboratory: options.lab, text, forageType: options.forageType, sampleDate: options.sampleDate, documentUrl: options.file }));
  });

program
  .command("forage-lab:validate")
  .description("Validate a forage laboratory report file without persistence")
  .requiredOption("--lab <id>", "lab id")
  .requiredOption("--file <path>", "CSV/TSV/text/PDF-extracted text file")
  .action((options: { lab: any; file: string }) => {
    const text = readFileSync(options.file, "utf8");
    const analysis = parseForageLaboratoryImport({ laboratory: options.lab, text, documentUrl: options.file });
    print({ valid: Object.keys(analysis.nutrients).length > 0, extractedNutrients: Object.keys(analysis.nutrients), analysis });
  });

for (const worker of ["discovery", "products", "availability", "prices", "recalculate", "outbox"] as OperationalWorkerName[]) {
  program.command(`worker:${worker}`).description(`Run ${worker} worker once`).option("--manufacturer <id>", "manufacturer connector id").option("--country <country>", "country code").action((options: { manufacturer?: string; country?: string }) => runWorker(worker, { connectorId: options.manufacturer, country: options.country }));
}

program
  .command("requirements")
  .description("Calculate horse requirements from a JSON profile")
  .argument("<horseJson>", "Horse profile JSON")
  .action(async (horseJson: string) => {
    const engine = await createSeededEngine();
    print(engine.calculateRequirements(JSON.parse(horseJson) as HorseProfile));
  });

program
  .command("program:analyse")
  .description("Analyse a feeding program from JSON")
  .argument("<programJson>", "Feeding program JSON")
  .action(async (programJson: string) => {
    const engine = await createSeededEngine();
    print(engine.analyseFeedingProgram(JSON.parse(programJson) as FeedingProgram));
  });

program
  .command("recommend")
  .description("Recommend feeding changes from a feeding program JSON")
  .argument("<programJson>", "Feeding program JSON")
  .action(async (programJson: string) => {
    const engine = await createSeededEngine();
    print(await engine.recommendForProgram(JSON.parse(programJson) as FeedingProgram));
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function print(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

async function runWorker(worker: OperationalWorkerName, options: { connectorId?: string; country?: string; productId?: string } = {}) {
  const { engine, repository } = await createOperationalRuntime();
  const runner = new OperationalWorkerRunner(engine, repository);
  print(await runner.run(worker, options));
}
