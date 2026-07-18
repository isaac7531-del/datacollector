import {
  CompetitionDataEngine,
  createCompetitionDataApiServer,
  createPostgresRepositories
} from "../src";

const repository = createPostgresRepositories({
  connectionString: process.env.DATABASE_URL
});

const engine = new CompetitionDataEngine({
  repository,
  connectors: [],
  importBatchPrefix: "equibets-replit"
});

const server = createCompetitionDataApiServer({
  engine,
  repository,
  bodyLimitBytes: Number(process.env.COMPETITION_DATA_BODY_LIMIT_BYTES ?? 1048576)
});

server.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? "0.0.0.0");
