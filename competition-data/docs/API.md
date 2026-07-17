# HTTP API

The runnable API is created with `createCompetitionDataApiServer`.

## Runtime endpoints

- `GET /health`
- `GET /ready`

## Connectors

- `GET /connectors`
- `GET /connectors/:id`
- `GET /connectors/:id/health`
- `POST /connectors/:id/run`
- `POST /connectors/:id/backfill`
- `POST /connectors/:id/enable`
- `POST /connectors/:id/disable`

## Imports

- `POST /imports/file`
- `POST /imports/url`
- `GET /imports`
- `GET /imports/:id`
- `POST /imports/:id/retry`
- `POST /imports/:id/rollback`

`/imports/file` currently accepts JSON bodies containing file content. Replit can wrap this endpoint with its existing multipart upload middleware.

## Staging

- `GET /staged-records`
- `GET /staged-records/:id`
- `POST /staged-records/:id/reprocess`

## Resolution and conflicts

- `GET /resolution-candidates`
- `GET /resolution-candidates/:id`
- `POST /resolution-candidates/:id/confirm`
- `POST /resolution-candidates/:id/reject`
- `GET /conflicts`
- `GET /conflicts/:id`
- `POST /conflicts/:id/resolve`

## Manual results

- `POST /manual-results`
- `PATCH /manual-results/:id`
- `POST /manual-results/:id/confirm-match`
- `POST /manual-results/:id/reject-match`

## Data access

- `GET /events`
- `GET /events/:id`
- `GET /horses`
- `GET /horses/:id`
- `GET /horses/:id/results`
- `GET /riders`
- `GET /riders/:id`
- `GET /riders/:id/results`
- `GET /combinations/:id/results`
- `GET /results/:id`
- `GET /results/:id/provenance`
- `GET /results/:id/versions`

The in-memory repository can serve basic read responses for demo/testing. Production data access should use the PostgreSQL adapter or a Replit ORM adapter.

## API boundaries

- Authentication is provided through `AuthAdapter`.
- Role authorization is delegated to the adapter.
- Responses include `x-correlation-id`.
- JSON request size is limited by `COMPETITION_DATA_BODY_LIMIT_BYTES`.
- Basic in-process rate limiting is included; production deployments can replace it at the edge.
