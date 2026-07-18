# France Eventing / FFE source assessment

Assessment date: 2026-07-18

## Organisation and providers

- Official organisation: Fédération Française d'Équitation (FFE).
- Competition system referenced publicly: FFE Compet / FFE SIF.
- Public FFE pages include Grand National CCE circuit pages and rankings summaries.

## Reconnaissance findings

- Event calendar/results: FFE Compet appears to centralise official competition data.
- Public result provider: likely FFE Compet for official amateur/pro/elevage results; exact public API/export behaviour not confirmed.
- Historical navigation: Grand National pages and FFE Compet references expose rankings/results; event-level historical search needs further inspection.
- Entries/start lists: likely FFE Compet, may require account.
- Phase results: expected for concours complet but public export access not confirmed.
- Authentication: many FFE Compet workflows appear account-oriented.
- robots: `www.ffe.com/robots.txt` includes content-signal policy text; legal/source review required.
- Anti-bot: none encountered for public FFE pages.
- Server collection viability: partial for public FFE pages; FFE Compet needs dedicated assessment.

## Recommended mode

- Acquisition mode: `administrator-assisted` until public FFE Compet access is verified.
- Automation level: `administrator_assisted`.
- Current lifecycle: `reconnaissance`.

## Multilingual mappings

Preserve French originals and map with confidence:

- concours complet -> eventing
- dressage -> dressage
- cross -> cross country
- saut d'obstacles -> showjumping
- éliminé -> eliminated
- abandon -> retired
- non-partant -> no-show
- forfait -> withdrawn
- provisoire -> provisional
- définitif -> final

## Blockers

- Confirm FFE Compet public endpoints/exports.
- Determine whether event-level CCE result data is public without login.
