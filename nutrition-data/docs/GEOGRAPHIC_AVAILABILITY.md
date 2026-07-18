# Geographic Availability

Availability is evidence-based. A product is recommendable only when evidence supports availability for the horse location.

Evidence levels:

- officially marketed;
- officially distributed;
- retailer-confirmed;
- import-only;
- historical;
- inferred;
- unknown;
- unavailable.

Each evidence record includes:

- product ID;
- country;
- optional region;
- evidence type;
- source URL;
- verified date;
- expiry/recheck date;
- confidence;
- delivery mode.

Recommendation rules:

- unavailable products are excluded by default;
- officially distributed products outrank retailer and inferred evidence;
- import-only products require the user to enable imported options;
- stale evidence should trigger warnings and data-operations review;
- online delivery and physical stockists are distinct evidence types.
