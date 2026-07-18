# Live Nutrition Data Operations

The operational loop is:

1. Discover manufacturers from configured source targets.
2. Discover catalogue, sitemap and fallback product URLs.
3. Fetch product pages and public nutrition documents after robots checks.
4. Extract nutrients, ingredients, feeding directions, packaging and warnings.
5. Normalise units while retaining original declarations and conversion methods.
6. Build product identity keys that include country and formulation region.
7. Upsert product records and immutable product versions.
8. Persist availability evidence and source provenance.
9. Detect formulation, feeding, availability and discontinued changes.
10. Recalculate recommendations through integration-host ration IDs.

Default refresh cadence:

- Active product pages: monthly.
- Nutrition documents: monthly or checksum-triggered.
- Availability evidence: every 60 days.
- Public prices: every 14-30 days.
- Discontinued products: quarterly.
- Archived products: no routine refresh.
- Connector health: daily.

Live smoke tests are opt-in:

```bash
npm run smoke:live
```

Default tests use fixtures and mocked fetches so CI is deterministic.
