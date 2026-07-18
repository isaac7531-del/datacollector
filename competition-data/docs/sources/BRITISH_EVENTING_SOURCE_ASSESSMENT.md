# British Eventing source assessment

Assessment date: 2026-07-18

Representative URLs inspected:

- `https://www.britisheventing.com/results/event/THE-GRASSROOTS-CHAMPIONSHIPS~20098881`
- `https://www.britisheventing.com/results/event/TWESELDOWN-%282%29~20098861`
- `https://www.britisheventing.com/robots.txt`

## Findings

- Public entry points: result pages under `/results/event/{slug}~{eventId}`.
- Event calendar structure: event result pages include prior-year links and canonical event identifiers.
- Historical event navigation: pages include historical links for the same event name.
- Event identifiers: numeric suffix after `~`, e.g. `20098881`; internal `data-entity_id` values such as `a1PN...`.
- Class identifiers: public select options and result chunks expose `data-chunk_id` values such as `a1rN...`.
- Horse/rider identifiers: public tables show names; stable BE horse/rider IDs were not visible in initial table payloads.
- Entry-list structure: requires further inspection of `/compete/fixtures-and-results/...` and possibly related endpoints.
- Result-list structure: pages contain placeholder `<article class="load-results-table">` elements with `data-entity_id`, `data-chunk_id`, `data-definition_id`.
- Phase-result structure: result tables include POS, Horse, Rider, Pts, FP, D, SJ, SJT, XC, XCT, Total and completion codes.
- Pagination: event page lists class/section chunks; no row pagination observed for inspected chunks.
- Provisional/final status: page title says Results; no explicit final/provisional flag observed in initial payload.
- Correction behaviour: likely page contents update in place; use content fingerprints and recheck recent/final events.
- Downloadable files: not observed for inspected result pages.
- Embedded structured data: `drupalSettings` includes `be_results_pages.table_load_url`.
- JSON/XML requests used by page: public AJAX endpoint `/results-table-loader/{entity_id}/{chunk_id}/{definition_id}` returns JSON commands containing HTML tables.
- Static vs client-rendered: result tables are loaded through a server endpoint; ordinary server requests work with no browser.
- Authentication: not required for inspected public result pages.
- CAPTCHA/anti-bot: none encountered on inspected pages.
- robots.txt: accessible and includes explicit content-signal policy text; legal/source review still required for production collection.
- Rate sensitivity: use low request rates and cache event chunks by fingerprint.
- Ordinary server collection: works for inspected result pages and chunk endpoint.
- Browser execution required: not for inspected result chunks.
- Assisted capture required: not for inspected result chunks; may be needed for member-only data if encountered.

## Recommended connector mode

- Acquisition mode: `server`
- Automation level: `fully_automated` for inspected public result pages/chunk endpoint.
- Initial production status: disabled by default until source terms/rate policy are approved.

## Parser strategy

1. Discover public event result URLs from configured event list/backfill search.
2. Parse metadata, historical links, class select options and load-result articles.
3. Fetch each `/results-table-loader/...` JSON endpoint.
4. Parse semantic table headings, not visual CSS selectors.
5. Map BE levels and sections from discoverable values.
6. Preserve source event ID, entity ID, chunk ID and endpoint URL in provenance.

## Known limitations

- Initial reconnaissance did not identify a public calendar API.
- Horse/rider persistent IDs were not visible in the sampled result table payload.
- Some pages may include Cloudflare content links; connector must stop on challenges and not bypass.
