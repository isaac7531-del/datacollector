# Historical backfill

Backfills must be controlled per source.

Required plan fields:

- source;
- from/to date;
- discipline;
- country;
- event level;
- concurrency;
- request rate;
- resume checkpoint;
- maximum records;
- dry run;
- pause/resume/cancel status.

Run:

```bash
npm run backfill:plan -- --source rechenstelle --from 2024-01-01 --to 2025-12-31
npm run backfill:start -- --plan-id <id>
npm run backfill:pause -- --plan-id <id>
npm run backfill:resume -- --plan-id <id>
```

Do not run unrestricted multi-year crawls by default.
