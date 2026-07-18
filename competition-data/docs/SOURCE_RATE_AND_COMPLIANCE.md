# Source rate and compliance

## Global rules

- Prefer official APIs, feeds and exports.
- Use ordinary requests only.
- Stop on authentication prompts, CAPTCHA, DataDome or bot-protection challenges.
- Use connector-level enable/disable controls.
- Cache source documents and compare content fingerprints.
- Preserve source URLs and fetched timestamps.

## Initial rates

| Source | Mode | Suggested max rate |
|---|---|---:|
| Rechenstelle | server | 20 requests/minute, 2 concurrent |
| British Eventing | server | 20 requests/minute, 2 concurrent |
| FEI clear URLs | server, disabled | 5 requests/minute after approval |
| FEI browser-assisted | user controlled | user-paced |

## Alerts

Create operational alerts for:

- page structure changes;
- empty result rows;
- field coverage drops;
- challenges or blocks;
- duplicate spikes;
- unresolved entity spikes;
- unexpectedly long provisional state.
