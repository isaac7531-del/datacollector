# Rechenstelle connector

## Working capabilities

- Acquisition mode: `server`.
- Automation level: fully automated for inspected public agenda pages and linked public PDFs.
- Tested pages:
  - `https://www.rechenstelle.de/en/agenda/2025/wiesbaden/`
  - `https://www.rechenstelle.de/en/agenda/2024/kronenberg-3/`
- Parser support:
  - event page metadata;
  - public PDF links;
  - dressage/intermediate/final/fence-report document classification;
  - embedded PDF text extraction;
  - conservative final-result row extraction.

## Known limitations

- PDF text order varies by template.
- No OCR by default.
- FEI IDs are not always visible.
- Live smoke tests are gated by `LIVE_SOURCE_SMOKE=1` and are not part of default offline tests.

## Rate configuration

Default recommendation:

- 20 requests/minute maximum;
- 2 concurrent requests maximum;
- cache PDFs by checksum;
- recheck final events daily for 7 days, then weekly for 30 days.

## Operator actions

- Approve agenda URLs before enabling backfill.
- Run `npm run source:smoke -- --source rechenstelle` before production enablement.
