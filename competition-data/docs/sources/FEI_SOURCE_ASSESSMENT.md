# FEI/data.fei.org source assessment

Assessment date: 2026-07-18

Representative URLs/materials inspected:

- `https://data.fei.org/`
- `https://data.fei.org/robots.txt`
- FEI Web Services page.
- FEI National Federation CSV download How To.
- FEI XML automated result processing page and XSD documentation.
- FEI clear URL documentation discovered through FEI public documentation.

## Findings

- Public entry points: `https://data.fei.org`, horse/person performance pages, ranking pages and calendar/search pages.
- Event calendar structure: FEI documents clear URL patterns for calendar/results search, including date, discipline, show type and event code parameters.
- Historical event navigation: clear URL search supports date ranges; public pages link to event/competition/result pages.
- Event identifiers: FEI event code patterns like `{year}_{type}_{number}_{discipline}_...`; data.fei pages also use opaque encrypted `p=` values.
- Class identifiers: result/class IDs appear in linked result list URLs; detailed server automation capability must be tested per page.
- Horse identifiers: FEI IDs visible in horse pages/search where accessible.
- Rider identifiers: FEI IDs visible in athlete/person pages/search where accessible.
- Entry/result structure: FEI public pages can render performance/result tables; NF CSV exports and XML results provide structured source data.
- Phase-result structure: FEI XML/XSD result format describes discipline-specific result fields.
- Pagination: ASP.NET WebForms postback patterns appear in public performance pages.
- Provisional/final status: exports/XML can carry publication status; public pages must be evaluated per result page.
- Correction behaviour: FEI is authoritative; use source versioning and recheck final/corrected records through authorised exports or permitted pages.
- Downloadable files: logged-in NF users can download CSV exports; FEI publishes XML examples/XSDs and Excel result templates/forms.
- Embedded structured data: no open public JSON REST API confirmed. Third-party API claims exist but are not FEI official.
- JSON/XML requests used by public pages: official XML/XSD exists for result processing; Web Services are authorised/password-protected.
- Static HTML vs client-rendered: some public pages render HTML but data.fei server requests can return DataDome/CAPTCHA challenge.
- Authentication: required for NF CSV export and Web Services.
- CAPTCHA/anti-bot protections: `https://data.fei.org/robots.txt` returned a DataDome/CAPTCHA challenge in this environment.
- Published terms: FEI terms page identified; legal review required before public-page automation.
- Rate sensitivity: high. Use authorised APIs/exports first; public pages must be low-rate and stop on challenge.
- Ordinary server collection: not generally reliable. A successful public page does not prove all FEI pages are automatable.
- Browser execution required: likely for some public FEI pages if user can access them normally.
- Assisted capture required: yes for blocked pages or logged-in exports unless authorised Web Services are granted.

## Recommended connector modes

- Authorised FEI Web Services: `server`, `fully_automated`, disabled until credentials/approval.
- FEI CSV/XML/Excel exports: `file` or `administrator-assisted`, file-assisted.
- FEI public clear URLs: `server`, limited, disabled by default, stop on challenge.
- FEI page collection under user session: `browser-assisted`, user-controlled.

## Required controls

- No DataDome/CAPTCHA bypass.
- No proxy rotation for blocked access.
- No stealth/fingerprint spoofing.
- No FEI credential pooling.
- Stop on challenge, 403, 429 or bot-protection response.
- Store FEI source URLs, FEI IDs and import provenance.

## Known limitations

- FEI cannot be represented as a fully automated server connector unless authorised Web Services or approved exports are available.
- Browser-assisted workflows must keep the user in control and only read data visible to that user.
