# Real source validation

Validation date: 2026-07-18

## Search/discovery note

Bright Data MCP search was unavailable in this environment due an authentication error. Built-in web search was used only to discover candidate public URLs. No blocked pages, CAPTCHA flows, proxy rotation, browser fingerprint spoofing or anti-bot circumvention were used.

## Successfully tested source-derived fixture

### BDWP / Land Rover Burghley Horse Trials 2017

- Organisation: BDWP-hosted public eventing results page.
- Source URL: `http://www.bdwp.co.uk/cgi-bin/3d.pl?buster=no&fn=bur17.csv&frame=set&page=sj_res&sct=C`
- Date accessed: 2026-07-18.
- Access method: ordinary HTTP `GET`.
- Server response: `200`, `text/html`.
- Source type: public structured HTML table generated from a `fn=bur17.csv` parameter.
- CAPTCHA/auth/anti-bot: none encountered.
- Committed fixture: `tests/fixtures/real-sources/bdwp-burghley-2017-sj-sample.csv`.
- Fixture policy: tiny transformed sample of five rows for technical mapping validation; not a full copied dataset.
- Mapping profile: generic eventing CSV mapping (`syntheticNationalCsvConfiguration.resultMappings` compatible columns).
- Validation outcome: fixture can be previewed and imported through the CSV connector.
- Unmapped fields: source page includes richer presentation fields not captured in the tiny transformed fixture.
- Data-quality issues: none in the transformed fixture.
- Limitation: this does **not** prove raw public CSV URL import, because the candidate URL returned HTML rather than `text/csv`.

## Candidate sources not classified as operational validation

### FEI public eventing result format documentation

- URLs discovered:
  - `https://inside.fei.org/fei/your-role/it-services/results/eventing-results-forms`
  - `https://inside.fei.org/system/files/Eventing%20results%20description%202025.pdf`
- Classification: assisted FEI workflow documentation, not live result import validation.
- Limitation: no direct FEI result page automation was attempted or claimed.

### Public spreadsheet result files

- Status: not validated in this environment.
- Reason: no small, clearly reusable public `.xlsx` result file was identified and confirmed suitable for redistribution during this run.
- Follow-up: use `npm run mapping:inspect` and `npm run import:url` against an approved public spreadsheet URL once Replit selects a source.

### Public structured JSON/XML result source

- Status: not validated against a real public endpoint in this environment.
- Reason: discovered API/documentation examples either required third-party service terms review or were documentation examples rather than live public result exports.

## Operational conclusion

Real-source validation is partial. A public structured eventing results page was accessed responsibly and a tiny transformed fixture was validated. Raw public CSV, real public spreadsheet, and real public JSON/XML result imports remain pending and must not be described as certified live integrations.
