import type { NutritionDataRepository } from "../adapters/repository";
import { createManualNutritionConnector } from "../connectors/manualConnector";
import { createPublicNutritionFeedConnector } from "../connectors/publicJsonConnector";
import type { NutritionDataConnector } from "../connectors/types";
import type { FeedingProgram, FeedProduct, HorseProfile, Manufacturer, NormalizedNutritionPayload } from "../domain/types";
import { InMemoryNutritionDataRepository } from "../repositories/inMemory";
import { NutritionDataEngine, type NutritionDataEngineOptions } from "../service/NutritionDataEngine";

export function createNutritionDataEngine(options: Partial<NutritionDataEngineOptions> = {}): NutritionDataEngine {
  return new NutritionDataEngine({
    repository: options.repository ?? new InMemoryNutritionDataRepository(),
    connectors: options.connectors ?? [],
    eventPublisher: options.eventPublisher
  });
}

export function createManualConnector(options: {
  manufacturer: Manufacturer;
  payload: NormalizedNutritionPayload;
  id?: string;
  name?: string;
}): NutritionDataConnector {
  return createManualNutritionConnector(options);
}

export function createPublicFeedConnector(options: Parameters<typeof createPublicNutritionFeedConnector>[0]): NutritionDataConnector {
  return createPublicNutritionFeedConnector(options);
}

export async function importNutritionPayload(options: {
  repository?: NutritionDataRepository;
  manufacturer: Manufacturer;
  payload: NormalizedNutritionPayload;
}) {
  const connector = createManualNutritionConnector({ manufacturer: options.manufacturer, payload: options.payload });
  const engine = createNutritionDataEngine({ repository: options.repository, connectors: [connector] });
  return engine.runConnector(connector.descriptor.id);
}

export function calculateHorseRequirements(horse: HorseProfile) {
  return createNutritionDataEngine().calculateRequirements(horse);
}

export function analyseFeedingProgram(program: FeedingProgram) {
  return createNutritionDataEngine().analyseFeedingProgram(program);
}

export async function recommendFeedingChanges(options: {
  repository?: NutritionDataRepository;
  program: FeedingProgram;
  candidateProducts: FeedProduct[];
}) {
  const engine = createNutritionDataEngine({ repository: options.repository });
  return engine.recommendForProgram(options.program, { candidateProducts: options.candidateProducts });
}
