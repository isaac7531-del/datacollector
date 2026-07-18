# Eventing Ireland source assessment

Assessment date: 2026-07-18

## Organisation and providers

- Official organisation: Eventing Ireland.
- Public event calendar: `https://www.eventingireland.com/events/`.
- Public live/results provider observed: `https://results.eventingireland.com/`.
- Some international/historical Irish event PDFs are also hosted by Rechenstelle.

## Reconnaissance findings

- Event calendar: public Eventing Ireland events page lists event names, dates and entry status.
- Historical navigation: home page exposes latest results; deeper historical navigation requires provider inspection.
- Event identifiers: not yet confirmed; live app likely uses internal event IDs.
- Class/section identifiers: live results app shows class result areas but fetch mechanism requires deeper inspection.
- Entry lists/start lists: Eventing Ireland main site points entry actions into member area; public start lists may appear in live results.
- Result structure: live app displays DR, SJF, SJT, SJ, XCF, XCT, XC and Total columns.
- Team results: live app has team competition result section.
- Authentication: entries/member area requires login; public result viewing did not.
- robots: `https://www.eventingireland.com/robots.txt` returns `Crawl-delay: 10`.
- Anti-bot: none encountered on public live results root.
- Server collection viability: likely, but live app network requests need inspection.
- Browser-assisted requirement: not established.
- File-assisted fallback: Rechenstelle PDFs for some international Irish events.

## Recommended mode

- Acquisition mode: `server`.
- Automation level: `fully_automated` only after live app endpoint inspection and smoke tests.
- Current lifecycle: `reconnaissance`.

## Blockers

- Identify live results network endpoints and event IDs.
- Confirm result row payloads for current and historical events.
- Build parser fixtures.
