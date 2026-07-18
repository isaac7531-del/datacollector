# FEI/data.fei.org automatic result collection security audit

Audit date: 2026-07-18

## Scope

This audit reviews how EquiBets could collect the competition results it needs from FEI/data.fei.org in a secure, compliant and operationally supportable way.

This is **not** a bypass plan. The engine must not implement DataDome/CAPTCHA bypassing, stealth scraping, browser fingerprint spoofing, proxy rotation for blocked access or direct automation of pages that FEI actively blocks.

## Public FEI surfaces reviewed

The following FEI-controlled public materials were reviewed:

- FEI Web Services page: `https://inside.fei.org/fei/your-role/it-services/web-services`
- FEI How To: download results as CSV for National Federation users: `https://howto.fei.org/content/22/23/en/how-to-download-results-of-your-athletes-as-well-as-for-shows-held-in-your-country.html`
- FEI XML automated results processing page: `https://inside.fei.org/fei/your-role/it-services/xml-format`
- FEI Eventing results forms/docs discovered through FEI public pages.
- FEI clear URL documentation discovered through search: `https://inside.fei.org/system/files/Access_via_clear_URLs_November_2020.pdf`
- FEI website terms page discovered through search: `https://www.fei.org/terms-conditions` (fetch timed out in this environment; legal review still required).

## Key findings

### 1. Official machine-to-machine access exists, but is authorised access

FEI describes Web Services as machine-to-machine integration between national systems, organisers and the FEI system. The Web Services page states that:

- Organising Committees can consult and upload horse, person, calendar and result data.
- National Federations can consult, retrieve, modify and upload horse, person, calendar and result data.
- National Federations can retrieve results after competitions.
- Documentation is password protected and available only to National Federation or Organising Committee users with required FEI access.

Security conclusion:

- This is the preferred automation path if EquiBets has a legitimate FEI/NF/OC relationship or is operating as an approved IT provider.
- It requires contractual/credentialed access and should be implemented as an authorised connector, not as scraping.

### 2. FEI provides CSV downloads for logged-in National Federation users

The FEI How To page for NF users says the user must:

1. Go to `https://data.fei.org`.
2. Log in with FEI ID and password.
3. Use Calendar/Results > Results by NF.
4. Click **Download as CSV**.

Security conclusion:

- Automated ingestion from those CSV files is supportable when the file is supplied by an authorised user or an approved service integration.
- The current Competition Data Engine already supports this as an assisted workflow: upload/direct-import FEI CSV exports through `createFeiAssistedImportConnector`, `createCsvResultsConnector` or `createPublicFileUrlConnector` where access is permitted.
- The engine should not store personal FEI credentials for arbitrary user accounts unless Replit implements a formal credential vault, consent, tenant isolation and audit process.

### 3. FEI supports XML/XSD automated result processing

FEI publishes XML result format documentation, XSD files and XML examples for automated results processing. The FEI page describes the XML format as intended to automate result processing and data exchange between Organising Committees, National Federations and the FEI. It also states that organisers or IT providers need to complete an NDA form to be granted FEI Database access.

Security conclusion:

- FEI XML is a strong target format for EquiBets ingestion and validation.
- The current engine supports source-neutral XML, but a dedicated `fei-xml-results` normalizer should be added once FEI XSD samples are approved for use.
- This should remain an authorised/imported-file workflow unless FEI grants direct integration access.

### 4. Public data.fei.org pages expose results and performance data, but are not a public bulk API

Public search results show data.fei.org pages such as:

- Horse performance pages.
- Ranking list pages.
- Calendar/results search pages.
- Result list pages.

Security conclusion:

- Public pages can support limited, respectful, cache-heavy discovery or source-reference linking where technically appropriate and permitted.
- They should not be treated as a bulk extraction API.
- ASP.NET WebForms behaviours such as `__VIEWSTATE`, postbacks, pagination and encrypted/opaque IDs can create fragility and legal/compliance risk if automated aggressively.
- Any public-page connector must be disabled by default, allowlisted, rate limited, logged, and reviewed against FEI terms.

## Collection methods ranked by security/compliance posture

| Rank | Method | Automation level | Security posture | Engine support |
|---:|---|---|---|---|
| 1 | Official FEI Web Services with approved credentials/NDA | Full automation | Best | Add authorised connector after approval |
| 2 | FEI/NF CSV exports downloaded by authorised NF users | Assisted/full depending on integration | Strong if consented/audited | Supported via CSV/FEI-assisted imports |
| 3 | FEI XML/XSD result files from organisers/NFs/IT providers | Assisted/full depending on integration | Strong | Supported generically; add FEI-specific normalizer |
| 4 | FEI Excel result templates/exports | Assisted | Strong if files are user/admin supplied | `.xlsx` supported; `.xls` requires safe parser approval |
| 5 | Public clear URLs to calendar/result pages | Limited automation | Conditional | Supportable only as disabled-by-default public-page connector |
| 6 | Direct page automation of blocked/protected FEI pages | Not allowed | High risk | Do not implement |
| 7 | CAPTCHA/DataDome/proxy/stealth bypass | Not allowed | Prohibited | Do not implement |

## Threat model

### Assets

- FEI credentials, if any.
- Imported FEI result data.
- Horse/rider identities and performance histories.
- EquiBets user/private Stable Manager data.
- Source provenance and audit history.

### Abuse scenarios

- Credential misuse or sharing outside authorised FEI/NF/OC scope.
- Excessive public-page traffic creating denial-of-service or terms violations.
- Circumvention attempts against FEI anti-bot systems.
- Importing stale/provisional data as final.
- Incorrectly merging FEI IDs or national IDs.
- Public imports overwriting private Stable Manager notes or records.

### Required controls

- Per-connector enable/disable.
- Source allowlists.
- Strong service-to-service auth.
- Secret vault for any approved credentials.
- Tenant isolation.
- Request rate limits and backoff.
- Cache and conditional rechecks.
- Audit logs for every FEI import.
- Provenance on every record and field group where practical.
- Resolution Centre review for uncertain matches.
- No private Stable Manager overwrites.

## Safe implementation plan

### Phase A: Assisted FEI file workflows

Use existing engine capabilities:

- `createFeiAssistedImportConnector`
- `createCsvResultsConnector`
- `createExcelResultsConnector`
- `createXmlResultsConnector`
- mapping profiles
- staging/reconciliation/provenance

Operational flow:

1. Authorised FEI/NF/OC user downloads CSV/XML/Excel from FEI.
2. User/admin uploads file to EquiBets.
3. Engine stages raw payload and provenance.
4. Engine validates FEI IDs, class IDs, event IDs and result status.
5. Engine resolves horses/riders/events/classes.
6. Engine creates review candidates for uncertainty.
7. Engine persists canonical/versioned results.

### Phase B: Authorised FEI Web Services connector

Only implement after FEI/NF/OC approval.

Connector requirements:

- Credentials stored in Replit secret manager/vault.
- No user password logging.
- Per-tenant credential isolation.
- Request signing/session lifecycle documented.
- Rate limit aligned with FEI guidance.
- Full audit trail.
- Contract tests against FEI test environment where available.

### Phase C: Disabled-by-default public clear URL connector

Only implement if legal/source review approves.

Connector requirements:

- Allowlisted FEI hosts and URL templates only.
- No arbitrary URL input for non-admin users.
- Low request rates.
- Cache-first.
- No protected-page bypass.
- No CAPTCHA/DataDome bypass.
- Stop immediately on 403/429/CAPTCHA/bot-protection responses.
- Store source URL provenance and fetch timestamps.

## Red lines

Do not implement:

- CAPTCHA solving.
- DataDome bypass.
- Proxy rotation to evade FEI controls.
- Browser fingerprint spoofing.
- Stealth automation.
- Credential stuffing or shared FEI login pools.
- Automated scraping after FEI blocks or challenges the request.
- Bulk extraction from public pages without explicit approval.

## Recommended package changes

1. Add `fei-authorized-web-services` connector scaffold that is disabled unless credentials and an explicit `FEI_AUTHORIZED_ACCESS=true` flag are provided.
2. Add `fei-xml-results` normalizer mapped to FEI XSD fields.
3. Add `fei-results-csv` mapping profile for NF “Download as CSV” exports after receiving a sample export from an authorised user.
4. Add source policy config:
   - `collectionMethod: official_api | official_export | human_assisted | public_page`
   - `requiresApproval: true`
   - `stopOnBotProtection: true`
   - `maxRequestsPerMinute`
5. Add FEI-specific provenance fields:
   - FEI event ID
   - FEI competition/class ID
   - FEI athlete ID
   - FEI horse ID
   - source result ID
   - export/download timestamp
6. Add FEI import run audit template for Data Operations Centre.

## Auditor conclusion

The secure way to collect FEI results automatically is **not** to bypass data.fei.org protections. The viable paths are:

1. authorised FEI Web Services access;
2. authorised FEI/NF CSV exports;
3. FEI XML/XSD result files from approved organisers/NFs/IT providers;
4. FEI Excel result files supplied by authorised users;
5. limited public clear URL use only after legal/source approval.

The existing Competition Data Engine is already aligned with the assisted-file paths. The next compliant engineering step is to add FEI-specific normalizers and an authorised Web Services connector scaffold, not anti-bot circumvention.
