import { createServer, type IncomingMessage, type Server, type ServerResponse } from "http";
import { z } from "zod";
import type { CompetitionDataRepository } from "../adapters/repository";
import { noopLogger, type Logger } from "../adapters/logger";
import { ApiKeyAuthAdapter, type AuthAdapter } from "../auth/auth";
import { createCsvResultsConnector } from "../connectors/csvResultsConnector";
import { createPublicFileUrlConnector } from "../connectors/publicFileUrlConnector";
import type { DataSource, ManualEntrySubmission } from "../domain/types";
import type { CompetitionDataEngine } from "../service/CompetitionDataEngine";

export interface CompetitionDataApiServerOptions {
  engine: CompetitionDataEngine;
  repository: CompetitionDataRepository;
  auth?: AuthAdapter;
  logger?: Logger;
  bodyLimitBytes?: number;
  rateLimit?: { requests: number; windowMs: number };
}

interface RequestContext {
  correlationId: string;
  principalId?: string;
}

const runConnectorSchema = z.object({
  dryRun: z.boolean().optional(),
  discovery: z.record(z.string(), z.unknown()).optional()
});

const backfillSchema = z.object({
  from: z.string(),
  to: z.string(),
  dryRun: z.boolean().optional()
});

const fileImportSchema = z.object({
  connector: z.string().default("generic-csv"),
  fileName: z.string().optional(),
  content: z.string(),
  source: z.record(z.string(), z.unknown()),
  mapping: z.record(z.string(), z.string())
});

const urlImportSchema = z.object({
  connector: z.string().default("public-file-url"),
  url: z.string().url(),
  format: z.enum(["csv", "json", "xml", "xlsx"]).optional(),
  source: z.record(z.string(), z.unknown()),
  mapping: z.record(z.string(), z.string()).optional()
});

export function createCompetitionDataApiServer(options: CompetitionDataApiServerOptions): Server {
  const auth = options.auth ?? new ApiKeyAuthAdapter(process.env.COMPETITION_DATA_ENGINE_API_KEY);
  const logger = options.logger ?? noopLogger;
  const limiter = createRateLimiter(options.rateLimit ?? { requests: 120, windowMs: 60_000 });

  return createServer(async (request, response) => {
    const context: RequestContext = {
      correlationId: request.headers["x-correlation-id"]?.toString() ?? `corr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    };
    response.setHeader("x-correlation-id", context.correlationId);

    try {
      if (!limiter(request.socket.remoteAddress ?? "unknown")) {
        sendJson(response, 429, { error: "rate_limited", correlationId: context.correlationId });
        return;
      }

      const principal = await auth.authenticate(request);
      context.principalId = principal?.id;
      const url = new URL(request.url ?? "/", "http://localhost");
      const pathParts = url.pathname.split("/").filter(Boolean);

      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, { ok: true, service: "competition-data-engine", correlationId: context.correlationId });
        return;
      }

      if (request.method === "GET" && url.pathname === "/ready") {
        const healthRepository = options.repository as unknown as { healthCheck?: () => Promise<void> };
        const ready = typeof healthRepository.healthCheck === "function"
          ? await healthRepository.healthCheck().then(() => true, () => false)
          : true;
        sendJson(response, ready ? 200 : 503, { ready, correlationId: context.correlationId });
        return;
      }

      if (request.method === "GET" && url.pathname === "/connectors") {
        sendJson(response, 200, paginate(options.engine.listConnectors(), url));
        return;
      }

      if (pathParts[0] === "connectors" && pathParts[1]) {
        const connectorId = decodeURIComponent(pathParts[1]);
        if (request.method === "GET" && pathParts.length === 2) {
          const connector = options.engine.getConnector(connectorId);
          sendJson(response, connector ? 200 : 404, connector ?? { error: "not_found" });
          return;
        }
        if (request.method === "GET" && pathParts[2] === "health") {
          sendJson(response, 200, await options.engine.connectorHealth(connectorId));
          return;
        }
        if (request.method === "POST" && pathParts[2] === "run") {
          if (!(await auth.authorize(principal, "connector:run"))) return forbidden(response, context);
          const body = runConnectorSchema.parse(await readJsonBody(request, options.bodyLimitBytes));
          sendJson(response, 202, await options.engine.runConnector(connectorId, { ...body, correlationId: context.correlationId }));
          return;
        }
        if (request.method === "POST" && pathParts[2] === "backfill") {
          if (!(await auth.authorize(principal, "connector:backfill"))) return forbidden(response, context);
          const body = backfillSchema.parse(await readJsonBody(request, options.bodyLimitBytes));
          sendJson(response, 202, await options.engine.runBackfill(connectorId, body.from, body.to, { dryRun: body.dryRun, correlationId: context.correlationId }));
          return;
        }
        if (request.method === "POST" && pathParts[2] === "enable") {
          if (!(await auth.authorize(principal, "connector:enable"))) return forbidden(response, context);
          sendJson(response, 200, options.engine.setConnectorStatus(connectorId, true));
          return;
        }
        if (request.method === "POST" && pathParts[2] === "disable") {
          if (!(await auth.authorize(principal, "connector:disable"))) return forbidden(response, context);
          sendJson(response, 200, options.engine.setConnectorStatus(connectorId, false));
          return;
        }
      }

      if (request.method === "POST" && url.pathname === "/imports/file") {
        if (!(await auth.authorize(principal, "imports:file"))) return forbidden(response, context);
        const body = fileImportSchema.parse(await readJsonBody(request, options.bodyLimitBytes));
        const connector = createCsvResultsConnector({
          id: body.connector,
          enabled: true,
          source: body.source as unknown as DataSource,
          mapping: body.mapping,
          csvText: body.content
        });
        options.engine.registerConnector(connector);
        sendJson(response, 202, await options.engine.runConnector(body.connector, { correlationId: context.correlationId }));
        return;
      }

      if (request.method === "POST" && url.pathname === "/imports/url") {
        if (!(await auth.authorize(principal, "imports:url"))) return forbidden(response, context);
        const body = urlImportSchema.parse(await readJsonBody(request, options.bodyLimitBytes));
        const connector = createPublicFileUrlConnector({
          id: body.connector,
          enabled: true,
          source: body.source as unknown as DataSource,
          urls: [body.url],
          format: body.format,
          mapping: body.mapping
        });
        options.engine.registerConnector(connector);
        sendJson(response, 202, await options.engine.runConnector(body.connector, { correlationId: context.correlationId }));
        return;
      }

      if (request.method === "GET" && url.pathname === "/imports") {
        sendJson(response, 200, paginate((await options.repository.listImportRuns?.()) ?? [], url));
        return;
      }

      if (pathParts[0] === "imports" && pathParts[1]) {
        const importId = decodeURIComponent(pathParts[1]);
        if (request.method === "GET") {
          sendJson(response, 200, (await options.repository.getImportRun?.(importId)) ?? { error: "not_found" });
          return;
        }
        if (request.method === "POST" && pathParts[2] === "retry") {
          if (!(await auth.authorize(principal, "imports:retry"))) return forbidden(response, context);
          sendJson(response, 202, { accepted: true, importId, action: "retry", correlationId: context.correlationId });
          return;
        }
        if (request.method === "POST" && pathParts[2] === "rollback") {
          if (!(await auth.authorize(principal, "imports:rollback"))) return forbidden(response, context);
          sendJson(response, 202, { accepted: true, importId, action: "rollback", safeRollback: "requires repository-specific implementation" });
          return;
        }
      }

      if (request.method === "GET" && url.pathname === "/staged-records") {
        sendJson(response, 200, paginate((await options.repository.listStagedRecords?.()) ?? [], url));
        return;
      }
      if (pathParts[0] === "staged-records" && pathParts[1]) {
        const stagedId = decodeURIComponent(pathParts[1]);
        if (request.method === "GET") {
          sendJson(response, 200, (await options.repository.getStagedRecord?.(stagedId)) ?? { error: "not_found" });
          return;
        }
        if (request.method === "POST" && pathParts[2] === "reprocess") {
          sendJson(response, 202, { accepted: true, stagedId, action: "reprocess" });
          return;
        }
      }

      if (request.method === "GET" && url.pathname === "/resolution-candidates") {
        sendJson(response, 200, paginate((await options.repository.listResolutionCandidates?.()) ?? [], url));
        return;
      }
      if (pathParts[0] === "resolution-candidates" && pathParts[1]) {
        await handleResolutionCandidateRoute(request, response, options.repository, pathParts[1], pathParts[2]);
        return;
      }

      if (request.method === "GET" && url.pathname === "/conflicts") {
        sendJson(response, 200, paginate((await options.repository.listConflicts?.()) ?? [], url));
        return;
      }
      if (pathParts[0] === "conflicts" && pathParts[1]) {
        await handleConflictRoute(request, response, options.repository, pathParts[1], pathParts[2]);
        return;
      }

      if (request.method === "POST" && url.pathname === "/manual-results") {
        if (!(await auth.authorize(principal, "manual-results:create"))) return forbidden(response, context);
        const body = await readJsonBody<{ submission: ManualEntrySubmission; dryRun?: boolean }>(request, options.bodyLimitBytes);
        sendJson(response, 202, await options.engine.submitManualEntry(body.submission, { dryRun: body.dryRun }));
        return;
      }

      if (pathParts[0] === "manual-results" && pathParts[1]) {
        sendJson(response, 202, { accepted: true, manualResultId: pathParts[1], action: pathParts[2] ?? (request.method ?? "PATCH").toLocaleLowerCase("en") });
        return;
      }

      if (request.method === "GET" && ["events", "horses", "riders", "results", "combinations"].includes(pathParts[0] ?? "")) {
        sendJson(response, 200, readInMemoryData(options.repository, pathParts));
        return;
      }

      logger.warn("HTTP route not found", { path: url.pathname, correlationId: context.correlationId });
      sendJson(response, 404, { error: "not_found", correlationId: context.correlationId });
    } catch (error) {
      sendJson(response, error instanceof z.ZodError ? 400 : 500, {
        error: error instanceof z.ZodError ? "validation_error" : "internal_error",
        message: error instanceof Error ? error.message : "Unknown error",
        correlationId: context.correlationId
      });
    }
  });
}

async function handleResolutionCandidateRoute(
  request: IncomingMessage,
  response: ServerResponse,
  repository: CompetitionDataRepository,
  id: string,
  action?: string
) {
  const candidate = await repository.getResolutionCandidate?.(decodeURIComponent(id));
  if (request.method === "GET") {
    sendJson(response, candidate ? 200 : 404, candidate ?? { error: "not_found" });
    return;
  }
  if (request.method === "POST" && candidate && (action === "confirm" || action === "reject")) {
    const updated = { ...candidate, status: action === "confirm" ? "confirmed" : "rejected", resolvedAt: new Date().toISOString() } as const;
    await repository.updateResolutionCandidate?.(updated);
    sendJson(response, 202, updated);
    return;
  }
  sendJson(response, 404, { error: "not_found" });
}

async function handleConflictRoute(
  request: IncomingMessage,
  response: ServerResponse,
  repository: CompetitionDataRepository,
  id: string,
  action?: string
) {
  const conflict = await repository.getConflict?.(decodeURIComponent(id));
  if (request.method === "GET") {
    sendJson(response, conflict ? 200 : 404, conflict ?? { error: "not_found" });
    return;
  }
  if (request.method === "POST" && conflict && action === "resolve") {
    const updated = { ...conflict, status: "resolved" as const, resolvedAt: new Date().toISOString() };
    await repository.updateConflict?.(updated);
    sendJson(response, 202, updated);
    return;
  }
  sendJson(response, 404, { error: "not_found" });
}

async function readJsonBody<T>(request: IncomingMessage, limitBytes = 1024 * 1024): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limitBytes) throw new Error(`Request body exceeds ${limitBytes} bytes.`);
    chunks.push(buffer);
  }
  if (!chunks.length) return {} as T;
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function forbidden(response: ServerResponse, context: RequestContext): void {
  sendJson(response, 403, { error: "forbidden", correlationId: context.correlationId });
}

function paginate<T>(items: T[], url: URL) {
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  return {
    items: items.slice(offset, offset + limit),
    pagination: { limit, offset, total: items.length }
  };
}

function createRateLimiter(config: { requests: number; windowMs: number }) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (key: string): boolean => {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + config.windowMs });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= config.requests;
  };
}

function readInMemoryData(repository: CompetitionDataRepository, pathParts: string[]) {
  const record = repository as unknown as Record<string, unknown[]>;
  const collection = pathParts[0] === "events" ? record.events : record[pathParts[0] ?? ""];
  if (!Array.isArray(collection)) return { items: [] };
  if (pathParts[1] && pathParts[2] === "results") {
    return { items: (record.results ?? []).filter((result) => JSON.stringify(result).includes(pathParts[1] ?? "")) };
  }
  if (pathParts[1]) {
    return collection.find((item) => (item as { id?: string }).id === pathParts[1]) ?? { error: "not_found" };
  }
  return { items: collection };
}
