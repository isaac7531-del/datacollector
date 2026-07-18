# Real Source Validation

## Current implemented launch connectors

| Manufacturer | Countries | Acquisition mode | Status |
|---|---|---|---|
| Mitavite | AU | fully automated | Source config and parser implemented; live smoke opt-in |
| Hygain | AU | fully automated | Live discovery passed; collection partial pending nutrient parser coverage |
| Pryde's EasiFeed | AU | fully automated | Live discovery passed after URL exclusions; collection acceptance pending |
| Barastoc | AU | document-assisted | Public PDF specification sheets discovered and collected in memory |
| CopRice | AU | fully automated | Partial public product pages collected; complete catalogue discovery pending |
| Dengie | GB, IE | fully automated | Source config and parser implemented; live smoke opt-in |
| Dodson & Horrell | GB, IE | document-assisted | Source config, PDF text extraction and parser implemented; live smoke opt-in |
| St. Hippolyt | DE, AT | fully automated | Source config and German label parser support implemented; live smoke opt-in |
| Dunstan | NZ | fully automated | Source config and parser implemented; live smoke opt-in |
| Triple Crown | US | fully automated | Source config and guaranteed-analysis parser implemented; live smoke opt-in |

## Acceptance target status

The final Phase 2 target is:

- at least 250 real products;
- at least 19 manufacturers;
- at least 6 product categories;
- at least 4 regional formulations or country-specific variants;
- at least 10 discontinued/replaced examples where discoverable;
- nutrient provenance for every verified product;
- geographic evidence for every recommendable product.

This commit does not claim those counts are satisfied. It adds the live acquisition framework, source registry and launch connectors needed to collect and validate those counts. Live counts must be produced with `npm run smoke:live` and operational collection jobs in an environment where public HTTP access to each source is allowed.

## Expanded onboarding registry

The source registry now includes a larger administrator-assisted cohort spanning Australia, UK/Ireland, Germany/EU, France, Italy, USA and New Zealand. These targets are tracked so source reconnaissance can proceed systematically, but their products are not verified until connector-specific evidence is collected.

## Forage laboratory support

Forage laboratory import profiles are implemented for Equi-Analytical, Dairy One, CVAS, Eurofins and local forage laboratories. User-uploaded hay analyses can override generic forage assumptions in ration analysis.

## Versioned prices

Public price observations are immutable price versions. Price history analytics can calculate inflation, cheapest region, cost trends, average monthly feed cost and seasonal pricing.

## Unsupported or deferred sources

Sources that require login, CAPTCHA, blocked client rendering, or unclear terms must be marked administrator-assisted, unavailable or unsupported. Do not use stealth plugins, proxy rotation, fingerprint spoofing or account circumvention.
