# Rechenstelle source assessment

Assessment date: 2026-07-18

Representative URLs inspected:

- `https://www.rechenstelle.de/`
- `https://www.rechenstelle.de/en/agenda/2025/wiesbaden/`
- `https://rechenstelle.de/en/agenda/2024/kronenberg-3/`
- `https://live.rechenstelle.de/2026/luhmuehlen_tgl/leaderboard02.html`
- Public result PDF example linked from agenda pages.

## Findings

- Public entry points: home page lists current/latest shows; agenda pages use `/en/agenda/{year}/{slug}/`; German pages use `/de/veranstaltungen/{year}/{slug}/`.
- Event calendar structure: static server-rendered agenda pages and show lists.
- Historical navigation: year appears in agenda URLs; search results show historical year/event slugs.
- Event identifiers: URL year/slug plus PDF filenames such as `wiesb_010_ergelges-1fr3.pdf`.
- Class identifiers: headings such as `CCI4*-S`; PDF filenames include class-like numeric codes (`010`, `901`, etc.).
- Horse/rider identifiers: FEI IDs are not always visible in extracted result text; bridle number, horse, rider and nation are visible.
- Entry/result structure: agenda page links to leaderboard, dressage result, intermediate result and final result PDFs.
- Phase-result structure: PDFs contain dressage, cross-country and showjumping columns; live leaderboard has HTML table columns.
- Pagination: agenda pages are plain pages; PDFs are individual documents.
- Provisional/final status: link text identifies `Result Dressage`, `Result after ...`, and `Final Result`.
- Correction behaviour: result documents can be replaced at the same event page; use content fingerprints and revisit final events for a correction window.
- Downloadable files: public PDFs under `/media/filer_public/...`.
- Embedded structured data: no JSON API observed for agenda pages; live leaderboards are HTML.
- Static vs client-rendered: agenda pages and PDFs are server-accessible; live leaderboard is server-accessible HTML.
- Authentication: none encountered for inspected pages.
- CAPTCHA/anti-bot: none encountered for inspected pages.
- robots.txt: root request redirects; no explicit blocker observed during ordinary page/PDF requests.
- Rate sensitivity: use low request rates and cache PDFs by checksum.
- Ordinary server collection: works for inspected agenda pages, live leaderboard and PDFs.
- Browser required: not for inspected pages.
- Assisted required: not for inspected pages; may be needed for future private documents.

## Recommended connector mode

- Acquisition mode: `server`
- Automation level: `fully_automated`
- Initial production status: enabled only after operator configures source rate limits and approves live smoke target.

## Parser strategy

1. Discover event URLs from configured agenda URLs or source home page.
2. Parse event metadata from headings/date text.
3. Parse class sections and links from agenda HTML.
4. Fetch linked public PDFs and extract embedded text using `pdf-parse`.
5. Parse rows conservatively; assign lower confidence if table text is ambiguous.
6. Preserve original PDF URL and checksum as provenance.

## Known limitations

- PDF text order can be dense; parser confidence varies by PDF template.
- Full table extraction is not equivalent to OCR; no repeated OCR should be run by default.
- FEI IDs may not be present in public Rechenstelle PDFs.
