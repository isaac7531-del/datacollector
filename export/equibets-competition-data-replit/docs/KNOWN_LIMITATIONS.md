# Known limitations

- No real FEI, national federation, state/regional federation, event organiser or ranking provider source is certified live from this repository.
- FEI direct page automation remains disabled where automated server access is blocked.
- Legacy `.xls` is supportable only after Replit selects and approves a safe parser with acceptable security/licence posture.
- HTTP `/imports/file` accepts JSON content payloads; production multipart upload should be provided by Replit's existing upload layer.
- PostgreSQL rollback removes engine tables for migration 002; domain-specific undo imports need application-specific implementation.
- Source-specific date formats are captured in config but not all regional formats are exhaustively parsed.
- The public URL connector does not use authenticated access, CAPTCHA bypass, browser automation, proxy rotation or anti-bot circumvention.
- Production tenant isolation must be implemented in the Replit repository adapter or PostgreSQL row policies.

## Supportable after integration

- Replit-specific auth, tenant and UI integration through the documented adapter contracts.
- Certified live national federation and event-provider connectors after source approval, mapping and end-to-end validation.

## Not supportable

- DataDome/CAPTCHA bypass.
- Proxy rotation or stealth techniques to defeat source protections.
- Browser fingerprint spoofing.
- Direct automation of FEI pages that actively block automated server access.
