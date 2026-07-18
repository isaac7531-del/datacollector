import type { AcquisitionMode, AutomationLevel } from "../connectors/types";

export type CanonicalSourceId =
  | "rechenstelle"
  | "british-eventing"
  | "fei"
  | "eventing-ireland"
  | "usea"
  | "equiratings"
  | "france-eventing"
  | "italy-eventing"
  | "equestrian-australia";

export type SourceLifecycleStatus =
  | "registered"
  | "reconnaissance"
  | "connector_scaffolded"
  | "discovery_working"
  | "collection_partial"
  | "live_smoke_passed"
  | "acceptance_testing"
  | "production_ready"
  | "temporarily_degraded"
  | "blocked"
  | "disabled";

export type CapabilitySupportStatus =
  | "supported"
  | "partially_supported"
  | "unsupported"
  | "blocked"
  | "requires_browser_assistance"
  | "requires_file_assistance"
  | "requires_authorised_access";

export type SourceCapabilityName =
  | "discoverRecentEvents"
  | "discoverUpcomingEvents"
  | "discoverHistoricalEvents"
  | "discoverUpdatedEvents"
  | "fetchEvent"
  | "discoverClasses"
  | "fetchEntries"
  | "fetchStartLists"
  | "fetchPhaseResults"
  | "fetchFinalResults"
  | "fetchTeamResults"
  | "fetchFenceReports"
  | "checkEventState"
  | "detectCorrections"
  | "determineNextCheckTime"
  | "buildBackfillPlan"
  | "resumeFromCheckpoint"
  | "runLiveSmokeTest";

export interface SourceCapabilityStatus {
  capability: SourceCapabilityName;
  status: CapabilitySupportStatus;
  evidence?: string;
  blocker?: string;
  nextTask?: string;
}

export interface RegisteredSource {
  id: CanonicalSourceId;
  organisation: string;
  aliases: string[];
  resultProviders: string[];
  acquisitionMode: AcquisitionMode;
  automationLevel: AutomationLevel;
  lifecycleStatus: SourceLifecycleStatus;
  publicEntryPoints: string[];
  lastDiscovery?: string;
  lastSuccessfulCollection?: string;
  lastPersistentImport?: string;
  latestParserVersion?: string;
  currentCheckpoint?: string;
  eventsDiscovered?: number;
  classesCollected?: number;
  resultRowsCollected?: number;
  unresolvedRate?: number;
  parsingConfidenceDistribution?: Record<string, number>;
  currentBlockers: string[];
  operatorActionRequired?: string;
  capabilities: SourceCapabilityStatus[];
}

interface SourceConfig {
  supported?: SourceCapabilityName[];
  partial?: SourceCapabilityName[];
  requiresBrowser?: SourceCapabilityName[];
  requiresFile?: SourceCapabilityName[];
  requiresAuth?: SourceCapabilityName[];
  blockers?: string[];
}

const allCapabilities: SourceCapabilityName[] = [
  "discoverRecentEvents",
  "discoverUpcomingEvents",
  "discoverHistoricalEvents",
  "discoverUpdatedEvents",
  "fetchEvent",
  "discoverClasses",
  "fetchEntries",
  "fetchStartLists",
  "fetchPhaseResults",
  "fetchFinalResults",
  "fetchTeamResults",
  "fetchFenceReports",
  "checkEventState",
  "detectCorrections",
  "determineNextCheckTime",
  "buildBackfillPlan",
  "resumeFromCheckpoint",
  "runLiveSmokeTest"
];

export const registeredSources: RegisteredSource[] = [
  source("rechenstelle", "Rechenstelle", ["rechenstelle.de"], ["rechenstelle"], "server", "fully_automated", "live_smoke_passed", ["https://www.rechenstelle.de/"], {
    supported: ["discoverRecentEvents", "discoverHistoricalEvents", "fetchEvent", "discoverClasses", "fetchPhaseResults", "fetchFinalResults", "fetchFenceReports", "buildBackfillPlan", "runLiveSmokeTest"],
    partial: ["fetchStartLists", "detectCorrections", "resumeFromCheckpoint", "determineNextCheckTime"],
    blockers: ["PDF row extraction has low-confidence warnings on several real documents."]
  }),
  source("british-eventing", "British Eventing", ["BE", "BritishEventing"], ["british-eventing"], "server", "fully_automated", "live_smoke_passed", ["https://www.britisheventing.com/results/event/"], {
    supported: ["fetchEvent", "discoverClasses", "fetchPhaseResults", "fetchFinalResults", "buildBackfillPlan", "runLiveSmokeTest"],
    partial: ["discoverHistoricalEvents", "detectCorrections", "determineNextCheckTime"],
    blockers: ["Calendar/event discovery beyond known result URLs still needs production implementation."]
  }),
  source("fei", "Fédération Equestre Internationale", ["FEI", "data.fei.org"], ["fei-web-services", "fei-exports", "fei-browser-assisted"], "browser-assisted", "browser_assisted", "blocked", ["https://data.fei.org/"], {
    requiresBrowser: ["fetchEvent", "discoverClasses", "fetchPhaseResults", "fetchFinalResults", "runLiveSmokeTest"],
    requiresFile: ["fetchEntries", "fetchStartLists"],
    requiresAuth: ["discoverRecentEvents", "discoverHistoricalEvents", "discoverUpdatedEvents"],
    blockers: ["data.fei.org returned DataDome/CAPTCHA challenge for ordinary server request."]
  }),
  source("eventing-ireland", "Eventing Ireland", ["EI", "EventingIreland"], ["eventing-ireland-live", "rechenstelle"], "server", "fully_automated", "reconnaissance", ["https://www.eventingireland.com/events/", "https://results.eventingireland.com/"], {
    partial: ["discoverUpcomingEvents", "discoverRecentEvents", "fetchFinalResults", "buildBackfillPlan"],
    blockers: ["Live results app provider/API shape needs deeper inspection."]
  }),
  source("usea", "United States Eventing Association", ["USEA", "United States Eventing Association", "USEventing"], ["usea-website", "evententries", "startbox"], "server", "administrator_assisted", "reconnaissance", ["https://useventing.com/events-competitions/resources/results"], {
    partial: ["discoverUpcomingEvents", "discoverHistoricalEvents", "buildBackfillPlan"],
    requiresFile: ["fetchFinalResults"],
    blockers: ["USEA live scoring often delegates to Event Entries or Start Box by event."]
  }),
  source("equiratings", "EquiRatings", ["EquiRatings Eventing", "ER"], ["equiratings-api"], "administrator-assisted", "administrator_assisted", "registered", ["https://www.equiratings.com/", "https://eventing.documentation.equiratings.com/"], {
    requiresAuth: allCapabilities,
    blockers: ["API requires partner credentials; public analytics are proprietary/licence-bound."]
  }),
  source("france-eventing", "Fédération Française d'Équitation / France Eventing", ["FFE", "Fédération Française d'Équitation", "FFE Compet", "France Eventing"], ["ffe-compet", "ffe-public"], "administrator-assisted", "administrator_assisted", "reconnaissance", ["https://www.ffe.com/", "https://www.ffesif.com/ffe-compet/"], {
    partial: ["discoverHistoricalEvents", "buildBackfillPlan"],
    requiresAuth: ["fetchEntries", "fetchStartLists", "fetchPhaseResults", "fetchFinalResults"],
    blockers: ["FFE Compet access and public result export behaviour require approved investigation."]
  }),
  source("italy-eventing", "Federazione Italiana Sport Equestri", ["FISE", "Federazione Italiana Sport Equestri", "Italy Eventing"], ["fise", "regional-fise"], "server", "file_assisted", "reconnaissance", ["https://www.fise.it/sport/completo/classifiche-completo.html"], {
    partial: ["discoverHistoricalEvents", "fetchFinalResults", "buildBackfillPlan"],
    requiresFile: ["fetchPhaseResults", "fetchTeamResults"],
    blockers: ["Many public records are PDF rankings/classifications; event-level provider mapping still required."]
  }),
  source("equestrian-australia", "Equestrian Australia / Eventing Australia", ["Equestrian Australia", "EA", "Eventing Australia", "Nominate", "Event Secretary"], ["equestrian-australia", "nominate", "event-secretary"], "server", "administrator_assisted", "reconnaissance", ["https://www.equestrian.org.au/members/search/eventing-results", "https://nominate.com.au/Scoreboard/results/", "https://eventsecretary.com.au/"], {
    partial: ["discoverRecentEvents", "discoverHistoricalEvents", "buildBackfillPlan"],
    requiresAuth: ["fetchFinalResults"],
    blockers: ["EA member search may require filters/member context; Australian events use multiple providers."]
  })
];

export function listRegisteredSources(): RegisteredSource[] {
  return registeredSources.map((source) => ({ ...source, capabilities: source.capabilities.map((capability) => ({ ...capability })) }));
}

export function getRegisteredSource(idOrAlias: string): RegisteredSource | undefined {
  const normalized = normalize(idOrAlias);
  return listRegisteredSources().find((source) => source.id === normalized || source.aliases.some((alias) => normalize(alias) === normalized));
}

export function validSourceIds(): CanonicalSourceId[] {
  return registeredSources.map((source) => source.id);
}

function source(
  id: CanonicalSourceId,
  organisation: string,
  aliases: string[],
  resultProviders: string[],
  acquisitionMode: AcquisitionMode,
  automationLevel: AutomationLevel,
  lifecycleStatus: SourceLifecycleStatus,
  publicEntryPoints: string[],
  config: SourceConfig
): RegisteredSource {
  return {
    id,
    organisation,
    aliases,
    resultProviders,
    acquisitionMode,
    automationLevel,
    lifecycleStatus,
    publicEntryPoints,
    latestParserVersion: "0.1.0",
    currentBlockers: config.blockers ?? [],
    capabilities: allCapabilities.map((capability) => ({
      capability,
      status: capabilityStatus(capability, config),
      blocker: capabilityStatus(capability, config) === "unsupported" ? "Capability not implemented for this source yet." : undefined
    }))
  };
}

function capabilityStatus(capability: SourceCapabilityName, config: SourceConfig): CapabilitySupportStatus {
  if (config.supported?.includes(capability)) return "supported";
  if (config.partial?.includes(capability)) return "partially_supported";
  if (config.requiresBrowser?.includes(capability)) return "requires_browser_assistance";
  if (config.requiresFile?.includes(capability)) return "requires_file_assistance";
  if (config.requiresAuth?.includes(capability)) return "requires_authorised_access";
  return "unsupported";
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
