# FEI/data.fei.org connector strategy

## Working capabilities

- File/export-assisted FEI CSV, Excel and XML imports through existing connectors.
- FEI browser-assisted collector scaffold for user-controlled collection from visible pages.
- FEI server clear URL reconnaissance documented.

## Collection modes

- Authorised Web Services: `server`, fully automated, disabled until credentials and approval.
- NF CSV/XML/Excel exports: `file` or `administrator-assisted`.
- Public clear URLs: limited `server`, disabled by default, stop on challenge.
- User-visible protected pages: `browser-assisted`.

## Known limitations

- `data.fei.org/robots.txt` returned a DataDome/CAPTCHA challenge in this environment.
- Direct blocked FEI automation is not supported.
- Public pages can use ASP.NET WebForms postbacks and opaque identifiers.

## Operator actions

- Obtain FEI/NF/OC approval for Web Services or exports.
- Use browser-assisted collector only with explicit user control.
- Do not store FEI credentials outside an approved Replit vault/tenant isolation design.

See `../FEI_AUTOMATION_SECURITY_AUDIT.md`.
