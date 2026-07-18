# Replit integration contract

## Main EquiBets application must provide

### Authentication and authorization

```ts
interface AuthAdapter {
  authenticate(request: IncomingMessage): Promise<{ id: string; roles: string[]; tenantId?: string } | undefined>;
  authorize(principal: AuthenticatedPrincipal | undefined, action: string): Promise<boolean>;
}
```

### Tenant context

All repository implementations must preserve tenant isolation for import runs, staged records, canonical records, conflicts, mapping profiles and events.

### Repository adapter decision

Use either:

- `createPostgresRepositories`, or
- an app-native `CompetitionDataRepository` implemented with Prisma, Drizzle, Kysely or another ORM.

### Public/private data boundary

Public data must not overwrite:

- private Stable Manager notes;
- health records;
- treatments;
- attachments;
- private training records;
- nutrition records;
- private owner communication.

### Consumers

The main app should connect consumers for:

- notifications;
- Coverage Intelligence;
- Entity Health Scores;
- EBI recalculation;
- horse/rider/combination profiles;
- Stable Manager timelines;
- Stable Manager notifications.

## Engine guarantees

- Stable package name: `@equibets/competition-data`.
- Versioned event schemas.
- Idempotent import-run identifiers when caller supplies `importBatchId`.
- Provenance records for imported payloads.
- Conflict records for material disagreements.
- Result version history interface.
- Transaction boundary for PostgreSQL reconciliation.
- Public-data/private-data merge protection.
- Consistent JSON error response shape.
- Pagination contract: `{ items, pagination: { limit, offset, total } }`.

## Example event

```json
{
  "id": "evt_123",
  "version": 1,
  "type": "competitionData.result.updated",
  "occurredAt": "2026-07-18T00:00:00.000Z",
  "correlationId": "import-123",
  "payload": {
    "incoming": {
      "horseName": "Example Horse",
      "riderName": "Example Rider"
    }
  }
}
```

## Error contract

```json
{
  "error": "validation_error",
  "message": "Request body exceeds limit",
  "correlationId": "corr_123"
}
```
