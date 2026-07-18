import type { CompetitionDataRepository } from "../adapters/repository";
import type { ManualEntrySubmission, NormalizedCompetitionGraph, ReconciliationPlan } from "../domain/types";
import { Reconciler } from "../reconciliation/reconciler";
import { validateCompetitionGraph } from "../validation/validateGraph";

export interface ManualEntryResult {
  plan: ReconciliationPlan;
  applied: boolean;
  created: number;
  updated: number;
  review: number;
  ignored: number;
}

export class ManualEntryService {
  private readonly reconciler: Reconciler;

  constructor(private readonly repository: CompetitionDataRepository) {
    this.reconciler = new Reconciler({ repository });
  }

  async submit(submission: ManualEntrySubmission, options: { dryRun?: boolean } = {}): Promise<ManualEntryResult> {
    const graph: NormalizedCompetitionGraph = {
      competition: submission.competition,
      events: submission.events ?? [],
      horses: submission.horses ?? [],
      riders: submission.riders ?? [],
      results: submission.results ?? [],
      entries: submission.entries ?? [],
      rankings: submission.rankings ?? [],
      provenance: [
        {
          source: {
            id: "manual-entry",
            name: "Manual entry",
            kind: "user_entry",
            mode: "manual",
            official: false
          },
          connectorId: "manual-entry",
          fetchedAt: submission.submittedAt,
          licenceNote: submission.sourceNote,
          importBatchId: `manual-${submission.submittedAt}`
        }
      ],
      issues: []
    };

    const issues = validateCompetitionGraph(graph, {
      requirePublicSource: false,
      requireResultParticipants: true
    });

    const plan = await this.reconciler.buildPlan({
      ...graph,
      issues
    });

    if (options.dryRun) {
      return {
        plan,
        applied: false,
        created: countAction(plan, "create"),
        updated: countAction(plan, "update"),
        review: countAction(plan, "review"),
        ignored: countAction(plan, "ignore")
      };
    }

    const applied = await this.repository.applyReconciliationPlan(plan);
    return {
      plan,
      applied: true,
      ...applied
    };
  }
}

function countAction(plan: ReconciliationPlan, action: "create" | "update" | "review" | "ignore"): number {
  return [
    plan.competition,
    ...plan.events,
    ...plan.horses,
    ...plan.riders,
    ...plan.results,
    ...plan.entries,
    ...plan.rankings
  ].filter((resolution) => resolution.action === action).length;
}
