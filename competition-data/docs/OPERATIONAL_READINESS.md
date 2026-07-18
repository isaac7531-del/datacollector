# Operational readiness audit

Audit date: 2026-07-18

This report distinguishes implemented package capabilities, synthetic-fixture validation, persistent PostgreSQL validation, HTTP/CLI/worker validation, real-source validation and production readiness. Synthetic fixtures are not classified as real-source validation.

## Environment note

This Cursor Cloud environment does not include Docker or system PostgreSQL binaries, and apt installation is blocked by OS permissions. A disposable embedded PostgreSQL server is used for operational PostgreSQL tests. `npm run test:postgres` no longer silently skips when `DATABASE_URL` is unavailable.

## Component matrix

| Component | Implemented | Synthetic fixtures | Persistent PostgreSQL | HTTP API | CLI | Worker | Real public file | Production-ready | Remaining limitation |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| CSV import | Yes | Yes | Yes | Boundary exists | Yes | Boundary exists | Transformed public-page fixture | Not yet | Needs certified raw public CSV source |
| Excel import | Yes (`.xlsx`) | Yes | Connector path tested via PostgreSQL pipeline indirectly | Via file/import boundary | Partial | Boundary exists | Pending | Not yet | `.xls` unsupported; needs real spreadsheet validation |
| JSON import | Yes | Yes | Connector path tested synthetically | Via file/import boundary | Partial | Boundary exists | Pending | Not yet | Needs real public structured source validation |
| XML import | Yes | Yes | Connector path tested synthetically | Via file/import boundary | Partial | Boundary exists | Pending | Not yet | Needs real public XML source validation |
| Public URL import | Yes | SSRF/allowlist tests | Connector can persist via PostgreSQL | Yes | Yes | Boundary exists | Pending raw URL | Not yet | Needs approved real public file URL |
| Manual import | Yes | Yes | Consumer and pipeline path | Yes | Boundary exists | Boundary exists | N/A | Not yet | Needs Replit auth/user/tenant integration |
| FEI-assisted import | Yes | Via generic import path | Generic assisted path | Via file/import boundary | Boundary exists | Boundary exists | Pending assisted exports | Assisted only | Direct FEI page automation intentionally unsupported |
| National connector configuration | Yes | Synthetic profiles | Seed persistence tested | Mapping CLI | Yes | Boundary exists | Transformed BDWP sample | Not yet | Needs real federation certification |
| Entity resolution | Yes | Benchmark tests | Indirect | Indirect | Indirect | Indirect | No | Not yet | Benchmark is synthetic regression only |
| Duplicate detection | Yes | Unit tests | Idempotent rerun test | Indirect | Indirect | Indirect | No | Not yet | Needs broader source-specific duplicate benchmarks |
| Reconciliation | Yes | Synthetic tests | Yes | Indirect | Indirect | Indirect | Transformed fixture | Not yet | Field-level production source policy still needs app integration |
| Conflict resolution | Yes | Unit/demo tests | Yes | Yes | Rollback/CLI boundary | Pending | No | Not yet | Needs Resolution Centre UI |
| Provenance | Yes | Synthetic path | Staged/provenance payloads persist | Indirect | Indirect | Indirect | Transformed fixture | Not yet | Field-level provenance is modelled but not fully UI-integrated |
| Rollback | Conservative plan/apply | Yes | Audit persistence supported | Yes | Yes | No | N/A | Not yet | Does not yet physically remove/revert canonical records without app policy |
| Scheduling | Yes | Lock logic | Persistent locks tested | Connector run/backfill | Yes | Yes | No | Not yet | Needs Replit scheduler deployment configuration |
| PostgreSQL | Adapter/migrations implemented | N/A | Yes via embedded PostgreSQL | Readiness/API query tested | Migration scripts | N/A | N/A | Not yet | Target Replit database still needs validation |
| HTTP API | Yes | Integration tests | Yes | Yes | N/A | N/A | N/A | Not yet | Multipart upload should be provided by Replit |
| Authentication boundary | Yes | Yes | N/A | Mutation auth test | N/A | N/A | N/A | Not yet | Needs Replit auth adapter |
| Event publishing | Yes | Synthetic events | Outbox tests | Metrics/API indirect | Indirect | Outbox worker tested | N/A | Not yet | External consumer delivery still adapter-specific |
| Docker | Dockerfile exists | Build not tested here | N/A | N/A | N/A | N/A | N/A | Not yet | Docker binary unavailable in this environment |
| Replit integration | Docs/examples exist | Package import tested | Pending | Boundary exists | Boundary exists | Boundary exists | N/A | Not yet | Needs consumer integration test with real PostgreSQL |

## Current readiness classification

The engine is operationally validated against disposable embedded PostgreSQL for migrations, persistence, locks, idempotent reruns, rollback/reapply, HTTP query, outbox and clean consumer integration. It is not yet production-ready for EquiBets until the same tests are run against the target Replit PostgreSQL database, real public raw files are approved and certified, and Replit auth/tenant/UI consumers are connected.
