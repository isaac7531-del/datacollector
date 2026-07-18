# Connector documentation

Every connector has a descriptor with:

- connector id and display name;
- source organisation;
- country;
- discipline coverage;
- competition levels;
- supported record types;
- source authority;
- collection method;
- public source URL pattern;
- check frequency;
- rate limits;
- retry policy;
- backfill support;
- provisional-result support;
- human-review requirement;
- enabled/disabled status;
- compliance note.

## Working connectors

### Generic CSV Results Connector

`createCsvResultsConnector`

Supports uploaded or local CSV content, configurable delimiter, encoding, decimal format, header aliases, column mapping, preview, row validation, unmapped-field preservation, event metadata, classes, horses, riders, entries, results and eventing phase fields.

### Generic Excel Results Connector

`createExcelResultsConnector`

Supports `.xlsx` files using `read-excel-file`, sheet selection, header-row selection, configurable mappings, preview, validation, and the same normalized pipeline as CSV.

Legacy `.xls` is supportable only if Replit selects a safe parser with acceptable security and licence posture. The package intentionally avoids adding vulnerable parser dependencies.

### Generic JSON Connector

`createJsonResultsConnector`

Supports source-neutral JSON schema version `1.0`. See `tests/fixtures/source-neutral-sample.json`.

### Generic XML Connector

`createXmlResultsConnector`

Supports source-neutral XML mapped into JSON schema version `1.0`, including namespaces through `fast-xml-parser` namespace-prefix removal. See `tests/fixtures/source-neutral-sample.xml`.

### Public File URL Connector

`createPublicFileUrlConnector`

Supports public HTTP/HTTPS CSV, JSON, XML and `.xlsx` files with:

- timeout handling;
- content-type validation;
- content-length/body limits;
- redirect limits;
- retry policy;
- in-memory response cache;
- clear user agent;
- SSRF protections.

It does not support authenticated access, CAPTCHA bypass, anti-bot circumvention, proxy rotation for blocked access or browser automation. If a source requires authentication, build an explicit authorised connector instead of using arbitrary URL import.

### Manual Import Connector

`createManualImportConnector`

Routes manual submissions through staging, validation, provenance, identity resolution and reconciliation. It is not a separate low-quality path.

### FEI Assisted Import Connector

`createFeiAssistedImportConnector`

Supports FEI data supplied through public downloads, user-uploaded exports, existing FEI exports, administrator-assisted imports and permitted public file URLs.

Direct FEI page automation is disabled by design where FEI pages block automated server access. FEI support remains focused on official/public downloads, exports, permitted public file URLs and administrator-assisted workflows.

## National results framework

`createNationalResultsConnector` accepts `NationalConnectorMapping` and delegates to the correct CSV, Excel, JSON or XML connector. Two synthetic example mappings are exported:

- `syntheticNationalCsvConfiguration`
- `syntheticNationalExcelConfiguration`

These are examples only. Certified live national federation or event-provider integrations are supported through this framework after source terms, mappings and end-to-end validation are completed.
