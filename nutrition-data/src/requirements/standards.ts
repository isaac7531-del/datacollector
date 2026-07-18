import type { RequirementStandardReference } from "../operations/types";

export const requirementStandards: RequirementStandardReference[] = [
  {
    id: "nrc-2007-software-heuristic",
    name: "NRC",
    version: "2007-derived-heuristic-v0.1",
    jurisdiction: "US/international reference",
    limitation: "Software heuristics approximate common NRC-style energy/protein/mineral relationships and are not a veterinary prescription."
  },
  {
    id: "expert-rule-safety-v0.1",
    name: "EXPERT_RULE",
    version: "0.1",
    limitation: "Safety and practical intake rules flag risks and recommend professional review; they do not diagnose or treat disease."
  }
];

export function defaultRequirementStandard(): RequirementStandardReference {
  return requirementStandards[0];
}
