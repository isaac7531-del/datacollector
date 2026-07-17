import { createServer, type IncomingMessage, type Server, type ServerResponse } from "http";
import type { DiscoveryContext } from "../connectors/types";
import type { IngestionRunOptions } from "../ingestion/ingestionEngine";
import type { ManualEntrySubmission } from "../domain/types";
import type { CompetitionDataEngine } from "../service/CompetitionDataEngine";

export interface CompetitionDataHttpServerOptions {
  engine: CompetitionDataEngine;
  apiKey?: string;
}

export function createCompetitionDataHttpServer(options: CompetitionDataHttpServerOptions): Server {
  return createServer(async (request, response) => {
    try {
      if (options.apiKey && request.headers.authorization !== `Bearer ${options.apiKey}`) {
        sendJson(response, 401, { error: "unauthorized" });
        return;
      }

      const url = new URL(request.url ?? "/", "http://localhost");

      if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, { ok: true, service: "competition-data-engine" });
        return;
      }

      if (request.method === "GET" && url.pathname === "/connectors") {
        sendJson(response, 200, {
          connectors: options.engine.listConnectors({
            enabledOnly: url.searchParams.get("enabledOnly") === "true"
          })
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/discovery") {
        const body = await readJsonBody<{ connectorIds?: string[]; context?: Record<string, unknown> }>(request);
        const discovered = await options.engine.discover((body.context ?? {}) as DiscoveryContext, body.connectorIds);
        sendJson(response, 200, { discovered });
        return;
      }

      if (request.method === "POST" && url.pathname === "/ingestion-runs") {
        const body = await readJsonBody<Record<string, unknown>>(request);
        const summary = await options.engine.runIngestion(body as IngestionRunOptions);
        sendJson(response, 202, summary);
        return;
      }

      if (request.method === "POST" && url.pathname === "/manual-submissions") {
        const body = await readJsonBody<Record<string, unknown>>(request);
        const result = await options.engine.submitManualEntry(body.submission as ManualEntrySubmission, {
          dryRun: body.dryRun === true
        });
        sendJson(response, 202, result);
        return;
      }

      sendJson(response, 404, { error: "not_found" });
    } catch (error) {
      sendJson(response, 500, {
        error: "internal_error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) {
    return {} as T;
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}
