import {
  syntheticNationalCsvConfiguration,
  syntheticNationalExcelConfiguration
} from "../connectors/nationalResultsConnector";
import { defaultSourceAuthorityRules } from "../reconciliation/sourceAuthority";

export const defaultSeedConfiguration = {
  connectors: [
    { id: "generic-csv", type: "csv", enabled: false },
    { id: "generic-excel", type: "excel", enabled: false },
    { id: "generic-json", type: "json", enabled: false },
    { id: "generic-xml", type: "xml", enabled: false },
    { id: "public-file-url", type: "public-url", enabled: false },
    { id: "manual-import", type: "manual", enabled: true },
    { id: "fei-assisted-import", type: "fei-assisted", enabled: false }
  ],
  sourceAuthorityRules: defaultSourceAuthorityRules,
  statusMappings: {
    placed: ["placed", "complete", "completed", "ok"],
    eliminated: ["el", "elim", "eliminated"],
    withdrawn: ["wd", "withdrawn", "scratched"],
    retired: ["ret", "retired"],
    disqualified: ["dq", "disqualified"],
    no_show: ["ns", "no show", "no_show"]
  },
  eventingClassMappings: {
    "CCI5*": { level: "international", discipline: "eventing" },
    "CCI4*": { level: "international", discipline: "eventing" },
    "CCI3*": { level: "international", discipline: "eventing" },
    "CCN2*-S": { level: "national", discipline: "eventing" },
    "EvA95": { level: "national", discipline: "eventing" }
  },
  entityResolutionThresholds: {
    horse: { update: 0.88, review: 0.62 },
    rider: { update: 0.86, review: 0.6 },
    event: { update: 0.84, review: 0.6 },
    result: { update: 0.9, review: 0.65 },
    default: { update: 0.82, review: 0.58 }
  },
  nationalProfiles: {
    syntheticNationalCsvConfiguration,
    syntheticNationalExcelConfiguration
  }
};
