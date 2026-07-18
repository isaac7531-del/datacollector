# Competition Data Engine architecture

## Service boundary

The engine is a standalone TypeScript service package. The main EquiBets Replit application integrates through `CompetitionDataEngine`, the HTTP adapter, or both.

```text
Source connectors
  -> discovery
  -> raw collection
  -> normalizers
  -> validation
  -> provenance
  -> reconciliation
  -> repository adapter
```

## Core ports

- `CompetitionDataConnector`: discovers and collects source payloads.
- `CompetitionDataNormalizer`: converts raw payloads into normalized competition graphs.
- `CompetitionDataRepository`: finds candidates and applies reconciliation plans using the host app database.
- `CompetitionDataScheduler`: schedules ingestion runs; can be replaced by external queues/workers.
- `Logger`: allows the host app to route logs into its production logging system.

## Entity resolution

Resolution is intentionally conservative:

1. Shared source identifiers are high confidence.
2. Exact normalized names add confidence.
3. Country and date agreement add confidence.
4. Medium-confidence matches become `review`.
5. Low-confidence matches create new entities.

The Data Operations Centre should own human review and override workflows.

## Source connector strategy

Every public source gets its own connector descriptor and enable flag. Connectors should document:

- source owner;
- source type;
- whether the source is official;
- collection method;
- relevant terms/licence notes;
- whether credentials or rate limits apply.

## Manual entry

Manual entry remains available through `ManualEntryService` for:

- unsupported events;
- historical records;
- training competitions;
- club events;
- Pony Club;
- user corrections;
- private notes;
- results with no reliable public source.
