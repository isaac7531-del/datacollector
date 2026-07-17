# Licence notes

Package licence: `UNLICENSED` for private EquiBets use.

Dependency licences should be reviewed during Replit integration with:

```bash
npm ls --all
```

Operational source licences/terms must be reviewed per connector before enabling production collection. Connector descriptors include `complianceNote` so source-specific terms can be visible in the Data Operations Centre.

The engine intentionally avoids:

- CAPTCHA solving;
- DataDome bypassing;
- proxy rotation;
- stealth browser automation;
- authenticated access to sources without explicit integration.
