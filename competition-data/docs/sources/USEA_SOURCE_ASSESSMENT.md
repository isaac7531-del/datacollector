# USEA source assessment

Assessment date: 2026-07-18

## Organisation and providers

- Official organisation: United States Eventing Association.
- Public website: `https://useventing.com/`.
- Public result resource: `https://useventing.com/events-competitions/resources/results`.
- USEA support states live scoring may be available through third-party services such as Event Entries or Start Box.

## Reconnaissance findings

- Event calendar: public USEA home/calendar pages expose event IDs such as `/events-competitions/calendar/event?event=19046`.
- Historical navigation: results resource page has year interval search controls.
- Event identifiers: numeric USEA event IDs in query parameters.
- Provider delegation: required. USEA event discovery must identify scoring provider per event.
- Class/division identifiers: likely division names from USEA results and provider pages.
- Entries/start lists/ride times: may be on event-specific/prize-list/provider pages.
- Result structure: USEA result resource exists, but public page appears client-rendered/Next.js; deeper network inspection required.
- Authentication: public result search visible; detailed/member-only features may require login.
- robots: `/robots.txt` returned 404 Next.js page with `noindex`; no explicit allow/deny found.
- Anti-bot: none encountered on representative result resource page.
- Server collection viability: partial; provider delegation likely necessary.

## Recommended mode

- Acquisition mode: `server` for USEA calendar/result discovery; provider-specific adapters for scoring.
- Automation level: `administrator_assisted` until provider routing is implemented.
- Current lifecycle: `reconnaissance`.

## Blockers

- Discover stable result search API or form submission shape.
- Identify Event Entries and Start Box result URL formats.
- Build provider adapters and provenance stitching.
