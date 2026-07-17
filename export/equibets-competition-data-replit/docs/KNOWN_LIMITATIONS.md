# Known limitations

- No real FEI, national federation, state/regional federation, event organiser or ranking provider source is certified live from this repository.
- FEI direct page automation remains disabled where automated server access is blocked.
- Legacy `.xls` is not supported without a safe parser.
- HTTP `/imports/file` accepts JSON content payloads; production multipart upload should be provided by Replit's existing upload layer.
- PostgreSQL rollback removes engine tables for migration 002; domain-specific undo imports need application-specific implementation.
- Source-specific date formats are captured in config but not all regional formats are exhaustively parsed.
- The public URL connector does not use authenticated access, CAPTCHA bypass, browser automation, proxy rotation or anti-bot circumvention.
- Production tenant isolation must be implemented in the Replit repository adapter or PostgreSQL row policies.
