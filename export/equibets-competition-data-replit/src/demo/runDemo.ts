import { readFileSync } from "fs";
import { join } from "path";
import {
  CompetitionDataEngine,
  InMemoryCompetitionDataRepository,
  createCsvResultsConnector,
  createManualImportConnector,
  syntheticNationalCsvConfiguration
} from "../index";
import { createResultDuplicateFingerprint, appearsToBeMaterialResultChange } from "../reconciliation/duplicateDetection";
import type { ConflictRecord } from "../domain/records";
import type { CompetitionResult, ManualEntrySubmission } from "../domain/types";

export async function runDemo(): Promise<void> {
  const fixturePath = join(process.cwd(), "tests/fixtures/eventing-results.csv");
  const csvText = readFileSync(fixturePath, "utf8");
  const repository = new InMemoryCompetitionDataRepository();
  const source = {
    id: "synthetic-national-eventing",
    name: "Synthetic National Eventing Federation",
    kind: "national_federation" as const,
    mode: "official_export" as const,
    countryCode: "AU",
    official: true,
    sourceUrl: "https://example.invalid/synthetic-eventing.csv"
  };
  const manualSubmission = createManualSubmission();

  const engine = new CompetitionDataEngine({
    repository,
    connectors: [
      createManualImportConnector({ enabled: true, submissions: [manualSubmission] }),
      createCsvResultsConnector({
        id: "synthetic-national-eventing",
        enabled: true,
        source,
        csvText,
        mapping: syntheticNationalCsvConfiguration.resultMappings ?? {},
        eventMetadata: {
          competitionName: "Synthetic Three Day Event",
          competitionId: "synthetic-2026",
          countryCode: "AU",
          discipline: "eventing",
          venue: "Synthetic Park",
          startDate: "2026-04-01"
        }
      })
    ]
  });

  console.log("Competition Data Engine demo");
  console.log("1. Importing manual historical result through the same pipeline");
  const manualSummary = await engine.runConnector("manual-import", { triggerType: "demo" });
  console.log(JSON.stringify(manualSummary, null, 2));

  console.log("2. Importing synthetic national CSV source");
  const publicSummary = await engine.runConnector("synthetic-national-eventing", { triggerType: "demo" });
  console.log(JSON.stringify(publicSummary, null, 2));

  console.log("3. Staging and provenance");
  console.log(JSON.stringify({ stagedRecords: repository.stagedRecords.length, eventsEmitted: repository.outboxEvents.length }, null, 2));

  console.log("4. Duplicate and correction detection");
  const northWind = repository.results.filter((result) => result.horseName === "North Wind");
  const duplicateFingerprints = new Set(northWind.map((result) => createResultDuplicateFingerprint({ result })));
  const materialChange =
    northWind.length >= 2 ? appearsToBeMaterialResultChange(northWind[0] as CompetitionResult, northWind[1] as CompetitionResult) : false;
  console.log(JSON.stringify({ northWindVersions: northWind.length, duplicateFingerprints: duplicateFingerprints.size, materialChange }, null, 2));

  console.log("5. Creating a material source conflict for administrator resolution");
  const conflict: ConflictRecord = {
    id: "demo-conflict-final-score",
    entityType: "result",
    fieldPath: "score",
    incomingValue: 31,
    existingValue: 35,
    sourceReferences: [],
    material: true,
    status: "open",
    createdAt: new Date().toISOString()
  };
  await repository.saveConflict(conflict);
  console.log(JSON.stringify(await repository.listConflicts(), null, 2));

  console.log("6. Resolving conflict and finalising provisional/corrected result");
  await repository.updateConflict({ ...conflict, status: "resolved", resolutionReason: "Corrected official result supersedes provisional score.", resolvedAt: new Date().toISOString() });
  console.log(JSON.stringify({ conflicts: await repository.listConflicts(), finalNorthWind: northWind.at(-1) }, null, 2));

  console.log("7. Downstream events emitted for targeted Replit recalculation");
  console.log(JSON.stringify(repository.outboxEvents.map((event) => ({ type: event.type, correlationId: event.correlationId })), null, 2));
}

function createManualSubmission(): ManualEntrySubmission {
  return {
    submittedAt: "2026-03-31T10:00:00.000Z",
    reason: "historical_record",
    sourceNote: "User-entered result later matched to public source.",
    competition: {
      externalIds: [{ sourceSystem: "manual", sourceId: "manual-synthetic-2026" }],
      name: "Synthetic Three Day Event",
      status: "completed",
      countryCode: "AU",
      startDate: "2026-04-01"
    },
    horses: [{ externalIds: [{ sourceSystem: "manual", sourceId: "manual-horse-1010" }], name: "North Wind" }],
    riders: [{ externalIds: [{ sourceSystem: "manual", sourceId: "manual-rider-2010" }], displayName: "Liam Scott" }],
    results: [
      {
        externalIds: [{ sourceSystem: "manual", sourceId: "manual-result-north-wind" }],
        horseName: "North Wind",
        riderName: "Liam Scott",
        score: 35,
        placing: 3,
        status: "placed",
        resultDate: "2026-04-01",
        metadata: { privateNotesPreserved: true }
      }
    ]
  };
}

if (require.main === module) {
  void runDemo();
}
