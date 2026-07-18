# Formulation Versioning

Product refreshes create immutable formulation versions when meaningful changes are detected.

Tracked changes:

- nutrient analysis;
- ingredients;
- feeding rate;
- product name;
- package size;
- country availability;
- warnings;
- intended use;
- product status.

Change classifications:

- cosmetic;
- packaging;
- feeding-guidance;
- formulation;
- nutrient declaration;
- availability;
- discontinued;
- replacement product.

Historical formulations must not be silently overwritten. The repository interface exposes product-version persistence and events are emitted for formulation and availability changes.
