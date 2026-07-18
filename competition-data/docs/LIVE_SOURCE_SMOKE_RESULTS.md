# Live source smoke results

Run date: 2026-07-18

These smoke tests prove ordinary server access and parser execution for selected pages. They do **not** satisfy the full Phase 4 acceptance targets.

## Rechenstelle

Command:

```bash
npm run source:smoke -- --source rechenstelle
```

Result:

- Discovered events: 2
- Payloads: 2
- Normalized graphs: 29
- Reconciliation plans: 29
- Created in dry-run: 3973
- Warnings: multiple `rechenstelle.pdf.low_confidence`

Interpretation:

- Server discovery and PDF fetching worked for real public Rechenstelle agenda pages.
- Embedded PDF text extraction worked.
- Parser produced many records but with low-confidence warnings on several PDFs.
- Rechenstelle connector is not production-ready until parser confidence is improved and at least five real events across the target formats are accepted.

## British Eventing

Command:

```bash
npm run source:smoke -- --source british-eventing
```

Result:

- Discovered events: 1
- Payloads: 1
- Normalized graphs: 2
- Reconciliation plans: 2
- Created in dry-run: 699
- Issues: none

Interpretation:

- Public result page discovery worked.
- Public `/results-table-loader/{entity_id}/{chunk_id}/{definition_id}` JSON endpoint worked.
- Parser produced records for two class chunks.
- British Eventing connector is not production-ready until at least five real events across target levels/years are accepted and source terms are approved.

## FEI

No FEI live server smoke is classified as successful.

- `data.fei.org/robots.txt` returned a DataDome/CAPTCHA challenge in this environment.
- Supported FEI paths remain:
  - authorised Web Services;
  - authorised CSV/XML/Excel exports;
  - browser-assisted user-controlled collector;
  - limited clear URL use only after approval and per-page testing.

## Next acceptance work

- Rechenstelle: improve PDF table extraction, add fixture checksums, validate five events/two years/HTML live leaderboard/PDF formats.
- British Eventing: validate five real events, multi-section events, multiple levels and historical years.
- FEI: implement authorised Web Services connector once credentials/approval exist, and test browser-assisted collector against inspected page types.
