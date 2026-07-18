# Replit Integration Contract

The package remains standalone. The main application must provide adapters for:

- auth context;
- tenant ID;
- user ID;
- horse ID;
- stable ID;
- event publication;
- email or notification requests;
- object storage;
- secrets;
- scheduled execution.

The main app owns:

- user accounts;
- horse ownership;
- stable membership;
- UI;
- subscription entitlements;
- final notification delivery;
- private ration records.

The engine owns:

- public manufacturer data;
- canonical products;
- nutrient definitions;
- availability evidence;
- formulation versions;
- public price observations;
- requirement calculations;
- ration analysis;
- recommendation computation.

Private ration IDs can be passed to recommendation recalculation workers, but the engine should not assume the application tenancy model.
