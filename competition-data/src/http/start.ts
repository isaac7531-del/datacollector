import { CompetitionDataEngine } from "../service/CompetitionDataEngine";
import { InMemoryCompetitionDataRepository } from "../adapters/repository";
import { createCompetitionDataApiServer } from "./server";

const repository = new InMemoryCompetitionDataRepository();
const engine = new CompetitionDataEngine({
  repository,
  connectors: [],
  importBatchPrefix: process.env.EQUIBETS_COMPETITION_DATA_BATCH_PREFIX ?? "competition-data"
});

const server = createCompetitionDataApiServer({
  engine,
  repository,
  bodyLimitBytes: Number(process.env.COMPETITION_DATA_BODY_LIMIT_BYTES ?? 1024 * 1024)
});

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);

server.listen(port, host, () => {
  console.log(JSON.stringify({ service: "competition-data-engine", host, port }));
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
