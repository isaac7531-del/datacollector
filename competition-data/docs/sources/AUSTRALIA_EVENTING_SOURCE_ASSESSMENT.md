# Australia Eventing / Equestrian Australia source assessment

Assessment date: 2026-07-18

## Organisation and providers

- National organisation: Equestrian Australia.
- Public/member search: `https://www.equestrian.org.au/members/search/eventing-results`.
- Public providers encountered:
  - Nominate / Scoreboard: `https://nominate.com.au/Scoreboard/results/`
  - Event Secretary: `https://eventsecretary.com.au/`
- State/event-specific providers likely vary by event.

## Reconnaissance findings

- Equestrian Australia result search page is visible but says filters are required to export a page.
- Nominate Scoreboard is public and returns a large HTML results/event page.
- Event Secretary markets live scoring and final online results for events it services.
- Event calendar: national/state calendars require further provider mapping.
- Class mappings: EvA50/EvA60/EvA65/EvA80/EvA95/EvA100/EvA105, CCN/CCI classes and state/national championships must be preserved as original labels.
- Authentication: EA member search may have member-oriented context; Nominate/Event Secretary public pages may not require login for some data.
- robots: EA robots has crawl-delay and standard disallows; Nominate/Event Secretary robots not found.
- Anti-bot: none encountered for representative public pages.
- Server collection viability: partial; provider adapters are required.

## Recommended mode

- Acquisition mode: `server` for public provider pages; `administrator-assisted` where EA member search/export requires authorised context.
- Automation level: `administrator_assisted` until provider-specific adapters are built.
- Current lifecycle: `reconnaissance`.

## Provider network

Australia must be modelled as a source network:

- EA national context.
- State branch context.
- Nominate provider provenance.
- Event Secretary provider provenance.
- Event-specific provider provenance.
- FEI duplicate handling for Australian FEI classes.

## Blockers

- Identify stable Nominate result endpoints.
- Identify Event Secretary public result URL patterns.
- Define cross-source deduplication for EA/state/provider/FEI records.
