#!/usr/bin/env node
import { Command } from "commander";
import type { FeedingProgram, HorseProfile } from "../domain/types";
import { createSeededEngine } from "./engineFactory";

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
