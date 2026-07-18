#!/usr/bin/env node
import { createPostgresRepositories, defaultSeedConfiguration } from "../index";

export async function seed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for npm run seed. Run migrations first, then seed the PostgreSQL-backed repository.");
  }

  const repository = createPostgresRepositories({ connectionString: databaseUrl });
  try {
    await repository.saveConfiguration("default-connectors", defaultSeedConfiguration.connectors);
    await repository.saveConfiguration("default-source-authority-rules", defaultSeedConfiguration.sourceAuthorityRules);
    await repository.saveConfiguration("default-status-mappings", defaultSeedConfiguration.statusMappings);
    await repository.saveConfiguration("default-eventing-class-mappings", defaultSeedConfiguration.eventingClassMappings);
    await repository.saveConfiguration("default-entity-resolution-thresholds", defaultSeedConfiguration.entityResolutionThresholds);
    await repository.saveMappingProfile(
      "synthetic-national-csv",
      defaultSeedConfiguration.nationalProfiles.syntheticNationalCsvConfiguration,
      false
    );
    await repository.saveMappingProfile(
      "synthetic-national-excel",
      defaultSeedConfiguration.nationalProfiles.syntheticNationalExcelConfiguration,
      false
    );
    console.log(JSON.stringify({ seeded: true, idempotent: true }));
  } finally {
    await repository.pool.end();
  }
}

if (require.main === module) {
  seed().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
