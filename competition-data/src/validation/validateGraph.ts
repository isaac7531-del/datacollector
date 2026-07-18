import type { DataQualityIssue, NormalizedCompetitionGraph } from "../domain/types";

export interface GraphValidationOptions {
  requirePublicSource?: boolean;
  requireResultParticipants?: boolean;
}

export function validateCompetitionGraph(
  graph: NormalizedCompetitionGraph,
  options: GraphValidationOptions = {}
): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];

  if (!graph.competition.name.trim()) {
    issues.push(issue("competition.name.required", "Competition name is required.", "error", "competition.name"));
  }

  if (!graph.competition.externalIds.length) {
    issues.push(issue("competition.external_id.missing", "Competition does not have a source identifier.", "warning", "competition.externalIds"));
  }

  if (graph.competition.startDate && graph.competition.endDate && graph.competition.startDate > graph.competition.endDate) {
    issues.push(issue("competition.date.invalid_range", "Competition start date is after end date.", "error", "competition"));
  }

  if (options.requirePublicSource && !graph.provenance.length) {
    issues.push(issue("provenance.required", "At least one provenance record is required.", "error", "provenance"));
  }

  graph.events.forEach((event, index) => {
    if (!event.name.trim()) {
      issues.push(issue("event.name.required", "Event name is required.", "error", `events.${index}.name`));
    }
  });

  graph.horses.forEach((horse, index) => {
    if (!horse.name.trim()) {
      issues.push(issue("horse.name.required", "Horse name is required.", "error", `horses.${index}.name`));
    }
  });

  graph.riders.forEach((rider, index) => {
    if (!rider.displayName.trim()) {
      issues.push(issue("rider.name.required", "Rider display name is required.", "error", `riders.${index}.displayName`));
    }
  });

  graph.results.forEach((result, index) => {
    if (!result.externalIds.length) {
      issues.push(issue("result.external_id.missing", "Result does not have a source identifier.", "warning", `results.${index}.externalIds`));
    }

    if (options.requireResultParticipants && !result.riderExternalId && !result.riderName) {
      issues.push(issue("result.rider.missing", "Result is missing rider identity.", "error", `results.${index}`));
    }

    if (options.requireResultParticipants && !result.horseExternalId && !result.horseName) {
      issues.push(issue("result.horse.missing", "Result is missing horse identity.", "error", `results.${index}`));
    }
  });

  return issues;
}

function issue(code: string, message: string, severity: DataQualityIssue["severity"], path: string): DataQualityIssue {
  return { code, message, severity, path };
}
