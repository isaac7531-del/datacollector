# Italy Eventing / FISE source assessment

Assessment date: 2026-07-18

## Organisation and providers

- Official organisation: Federazione Italiana Sport Equestri (FISE).
- Public eventing pages: `https://www.fise.it/sport/completo/classifiche-completo.html`.
- Some regional FISE pages publish event/result articles.

## Reconnaissance findings

- Public data: FISE publishes eventing classifications/rankings and downloadable PDFs.
- Event calendar: not fully mapped.
- Historical navigation: FISE category pages list PDFs by season/circuit.
- Event identifiers: PDF download IDs in query strings, e.g. `download=...`.
- Classes/divisions: PDF text includes CCI/pony/junior divisions and Italian team rankings.
- Entries/start lists: not identified in initial public pages.
- Phase/final results: some PDFs include phase penalties and final/team classifications.
- Authentication: public FISE pages accessible without login.
- robots: Joomla robots allows assets and disallows admin/system paths.
- Anti-bot: none encountered.
- Server collection viability: likely for public PDF/ranking pages.

## Recommended mode

- Acquisition mode: `server` for public PDFs/ranking pages.
- Automation level: `file_assisted`/partial server until event-level provider map is complete.
- Current lifecycle: `reconnaissance`.

## Italian mappings

- concorso completo -> eventing
- classifica -> placing/classification
- eliminato -> eliminated
- ritirato -> retired
- non partito -> no-show
- provvisorio -> provisional
- definitivo -> final
- penalità -> penalties
- tempo -> time

## Blockers

- Identify event-level scoring providers beyond rankings PDFs.
- Build PDF parser fixtures for FISE formats.
