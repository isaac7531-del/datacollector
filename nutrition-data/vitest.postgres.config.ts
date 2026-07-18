import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/postgresPersistence.test.ts", "tests/integration/postgresOperationalAcceptance.test.ts"]
  }
});
