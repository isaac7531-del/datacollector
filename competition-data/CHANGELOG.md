# Changelog

## 0.1.0

### Initial architecture

- Standalone TypeScript Competition Data Engine service.
- Public `CompetitionDataEngine` API and Replit-friendly helper functions.
- Connector registry, discovery, ingestion, staging, validation, normalization, identity resolution, reconciliation, provenance and event emission.

### Implemented connectors

- Generic CSV results connector.
- Generic `.xlsx` Excel results connector.
- Source-neutral JSON connector.
- Source-neutral XML connector.
- Public file URL connector for CSV, JSON, XML and `.xlsx`.
- Manual import connector.
- FEI assisted import connector for uploaded/permitted exports.
- Configuration-driven national results connector framework with synthetic examples.

### Storage support

- In-memory repository for tests and demos.
- PostgreSQL repository adapter with additive JSONB migrations, transaction support and scheduler locks.

### API support

- Runnable HTTP API with health/readiness, connector, import, staging, resolution, conflict, manual-result and read boundaries.
- Authentication and authorization adapter boundary.
- Correlation IDs, JSON request limits and basic rate limiting.

### Scheduling support

- In-process scheduler.
- Scheduler lock service.
- Worker entrypoint.
- Replit scheduled-job example.

### Supported import formats

- CSV
- `.xlsx`
- Source-neutral JSON schema `1.0`
- Source-neutral XML
- Public HTTP/HTTPS file URLs for supported formats
- Manual submissions

### Assisted workflows

- FEI public downloads, user-uploaded FEI exports and administrator-assisted FEI imports.
- User-uploaded official result files.
- Human review for uncertain matches, conflicts and unverified sources.

### Unsupported direct sources

- Direct FEI page automation where automated access is blocked.
- DataDome bypassing.
- CAPTCHA solving.
- Proxy rotation.
- Browser fingerprint spoofing.
- Stealth scraping.
- Authenticated/private data-source access.

### Known limitations

- No real public FEI or national federation source has been certified live end to end in this repository.
- Legacy `.xls` import is not enabled because a safe parser has not been selected.
- HTTP file upload currently accepts JSON bodies; Replit should wrap it with existing multipart upload middleware if needed.
- PostgreSQL integration tests require `DATABASE_URL`.
- Rollback is implemented at the migration/table level; domain-specific undo import should be connected to Replit's existing Import History/Undo workflows.
