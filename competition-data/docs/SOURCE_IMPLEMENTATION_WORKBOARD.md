# Source implementation workboard

Status values are intentionally conservative. A smoke test does not imply production readiness.

| Source | Capability | Status | Evidence | Blocker | Next task |
|---|---|---|---|---|---|
| rechenstelle | Registration | supported | Registry + connector |  | Improve acceptance coverage |
| rechenstelle | Reconnaissance | supported | Source assessment |  | Add more event formats |
| rechenstelle | Discovery | supported | Live smoke |  | Persist checkpoints in live DB |
| rechenstelle | Event details | partially_supported | Agenda parser |  | Improve date/venue metadata |
| rechenstelle | Classes | supported | Agenda links |  | Validate more class levels |
| rechenstelle | Entries | partially_supported | Start list links discovered | Parser incomplete | Parse start PDFs |
| rechenstelle | Phase results | partially_supported | PDF parser warnings | Low confidence rows | Improve PDF table extraction |
| rechenstelle | Final results | partially_supported | Live smoke | Low confidence rows | Acceptance fixtures |
| rechenstelle | Historical backfill | partially_supported | Backfill plan command | Not run persistently | Checkpointed worker |
| rechenstelle | Acceptance | unsupported |  | Needs five events/two years | Expand live tests |
| british-eventing | Registration | supported | Registry + connector |  |  |
| british-eventing | Reconnaissance | supported | Source assessment |  |  |
| british-eventing | Discovery | partially_supported | `/latest-results` discovery works with real event URLs | Broader calendar/date-range discovery incomplete | Event search/calendar backfill |
| british-eventing | Classes | supported | Results table loader chunks |  | More formats |
| british-eventing | Phase results | supported | Live smoke table chunks |  | More events/levels |
| british-eventing | Final results | supported | Live smoke: 2 latest events, 6 graphs, 0 issues | Needs 25-event acceptance | Acceptance suite |
| british-eventing | Historical backfill | partially_supported | Historical links | No broad crawler | Controlled backfill |
| british-eventing | Persistent import | partially_supported | `source:persist-smoke --limit 2` persisted 2 events to PostgreSQL | Full 25-event corpus not persisted | Persist acceptance corpus |
| british-eventing | API verification | unsupported |  | Canonical API routes not verified against corpus | Add API acceptance script |
| british-eventing | Acceptance | partially_supported | `source:acceptance` returns acceptance_testing with missing evidence | 25-event corpus, corrections, restart report missing | Expand coverage |
| fei | Registration | supported | Registry + docs |  | Authorised connector |
| fei | Discovery | requires_browser_assistance | DataDome on robots | Challenge on server | Browser queue / authorised WS |
| eventing-ireland | Registration | supported | Registry + scaffold |  | Inspect live app requests |
| usea | Registration | supported | Registry + scaffold |  | Provider routing |
| equiratings | Registration | supported | Registry + scaffold | Licence required | Partner agreement |
| france-eventing | Registration | supported | Registry + scaffold | FFE Compet access unclear | Inspect FFE Compet |
| italy-eventing | Registration | supported | Registry + scaffold | Event provider map incomplete | FISE PDF parser |
| equestrian-australia | Registration | supported | Registry + scaffold | Provider network incomplete | Nominate/Event Secretary adapters |
