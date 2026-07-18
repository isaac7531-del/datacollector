# British Eventing acceptance report

Report date: 2026-07-18

## Production-ready

**NO**

British Eventing remains `acceptance_testing`.

## Acceptance matrix status

The acceptance runner now creates a per-event matrix from `BRITISH_EVENTING_ACCEPTANCE_CORPUS.md` and verifies discovery, collection, persistence, version history, provenance and aggregate API availability.

### Proven subset

Command:

```bash
DATABASE_URL=... npm run source:acceptance -- --source british-eventing --limit 5
```

Result:

- 5 real corpus events requested.
- 5 discovered.
- 5 collected.
- 20 normalized class/result graphs.
- 5 competitions persisted.
- 20 class records persisted.
- 302 horses persisted.
- 251 riders persisted.
- 346 entries persisted.
- 318 results persisted.
- 318 result versions persisted.
- Repeat run result count unchanged.
- Repeat run result-version count unchanged.
- Restart run result count unchanged.
- Canonical API aggregate verification passed.

## Historical coverage summary

Current proven persisted subset:

- Years: 2026 only.
- Venues: multiple.
- Levels: multiple.
- Sections: multiple.

The 25-event corpus contains historical links in event pages, but the persisted acceptance run has not yet incorporated a second calendar year.

## Persistence report

Five-event run:

| Stage | Competitions | Classes | Horses | Riders | Entries | Results | Versions |
|---|---:|---:|---:|---:|---:|---:|---:|
| Before | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| After first run | 5 | 20 | 302 | 251 | 346 | 318 | 318 |
| After repeat run | 5 | 20 | 302 | 251 | 346 | 318 | 318 |
| After restart run | 5 | 20 | 302 | 251 | 346 | 318 | 318 |

## Restart report

The repository was closed and reopened between runs. A repeat collection over the same five events did not create duplicate canonical records or duplicate unchanged result versions.

## Checkpoint report

Checkpoint architecture exists, but the full 25-event acceptance run hung before completion and does not yet prove interruption/resume over the corpus.

## Version history report

Unchanged repeat collection no longer creates duplicate result versions.

Not yet proven:

- score correction;
- placing correction;
- status correction;
- rider/horse correction;
- emitted correction/finalisation events from a changed British Eventing source.

Synthetic correction helpers exist, but production acceptance requires clearly separated correction evidence.

## API verification report

Aggregate canonical API verification passed for:

- `GET /competitions`
- `GET /results`
- `GET /horses`
- `GET /riders`

Child routes now return data for at least one persisted competition:

- `GET /competitions/:id/classes`
- `GET /competitions/:id/results`

Further work is required for:

- `GET /horses/:id/results`
- `GET /riders/:id/results`
- `GET /combinations/:id/results`

## Health summary

Health summary is persisted during `source:persist-smoke`.

Acceptance health still needs:

- acceptance percentage;
- corpus completion;
- checkpoint progress;
- restart status;
- parser confidence distribution;
- remaining blockers.

## Full corpus attempt

Command attempted:

```bash
DATABASE_URL=... npm run source:acceptance -- --source british-eventing --limit 25
```

Outcome:

- The command did not complete within the execution timeout and produced no progress output after startup.
- It was stopped manually.
- This is a blocker: full acceptance needs checkpointed/progress-reporting execution so a long or slow event cannot stall the entire corpus.

## Remaining limitations / blockers

- 25-event persisted corpus not complete.
- Second calendar year not persisted.
- Full checkpoint recovery not proven.
- Live correction/versioning not proven.
- Full child API route set not verified.
- Full health acceptance metrics not complete.
- Full 25-event command needs checkpoint/progress isolation.

## Next implementation task

Make British Eventing acceptance execution checkpointed per event:

1. persist per-event acceptance progress;
2. continue after individual event failure;
3. print progress after each event;
4. support resume;
5. rerun the 25-event corpus;
6. add second-year historical URLs into the persisted run.
