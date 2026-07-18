# British Eventing connector

## Working capabilities

- Acquisition mode: `server` for inspected public results pages.
- Automation level: fully automated for inspected public result page chunks.
- Public endpoint used by page:
  - `/results-table-loader/{entity_id}/{chunk_id}/{definition_id}`
- Parser support:
  - event metadata;
  - historical event result links;
  - class/section chunks;
  - result table rows;
  - dressage, showjumping, cross-country and final penalty fields where present;
  - completion codes.

## Known limitations

- Initial reconnaissance did not identify a separate public calendar API.
- Some British Eventing pages may return Cloudflare content or challenges. Connector must stop on challenges.
- Horse/rider persistent IDs are not visible in sampled table payloads.
- Live smoke tests are gated by `LIVE_SOURCE_SMOKE=1`.

## Rate configuration

- 20 requests/minute maximum;
- 2 concurrent requests maximum;
- cache chunks by event ID and chunk ID;
- recheck recent/final events for correction window.

## Operator actions

- Review British Eventing content signals and source terms before broad backfill.
- Use `npm run source:discover -- --source british-eventing` on approved URLs.
