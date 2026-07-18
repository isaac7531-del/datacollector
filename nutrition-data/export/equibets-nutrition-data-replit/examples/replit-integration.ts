import { createNutritionDataEngine, InMemoryNutritionDataRepository } from "../src";

const engine = createNutritionDataEngine({
  repository: new InMemoryNutritionDataRepository()
});

export async function analyseHorseProgram(req: { body: any }) {
  const { program, candidateProducts } = req.body;
  return engine.recommendForProgram(program, { candidateProducts });
}
