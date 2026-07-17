import {
  CompetitionDataEngine,
  SchedulerLockService,
  createPostgresRepositories
} from "../src";

const repository = createPostgresRepositories({ connectionString: process.env.DATABASE_URL });
const engine = new CompetitionDataEngine({
  repository,
  connectors: []
});
const locks = new SchedulerLockService(repository);

export async function runScheduledCompetitionDataJob() {
  await locks.withLock("replit-scheduled:competition-data:all", 15 * 60_000, async () => {
    for (const connector of engine.listConnectors({ enabledOnly: true })) {
      await engine.runConnector(connector.id, { triggerType: "scheduled" });
    }
  });
}
