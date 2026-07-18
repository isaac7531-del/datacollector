import { createSeededEngine } from "../cli/engineFactory";
import { createNutritionHttpServer } from "./server";

async function main(): Promise<void> {
  const port = Number(process.env.NUTRITION_DATA_PORT ?? process.env.PORT ?? 3333);
  const engine = await createSeededEngine();
  const server = createNutritionHttpServer({ engine });

  server.listen(port, () => {
    console.log(`EquiBets Nutrition Data Engine listening on ${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
