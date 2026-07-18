# Price Data

Price observations are optional and expire.

Every captured public price is treated as an immutable price version. Product price timelines can therefore show changes such as:

| Month | Price |
|---|---:|
| Jan 2026 | 42.95 |
| Feb 2026 | 43.95 |
| Mar 2026 | 44.50 |

Supported fields:

- currency;
- package size;
- retailer;
- country;
- promotional flag;
- captured date;
- tax inclusion;
- delivery exclusion;
- confidence;
- source URL.

Recommendation output should distinguish:

- verified recent price;
- historical price;
- estimated cost;
- price unavailable.

The cost engine compares cost per kg, daily amount, monthly amount and nutrient contribution. Products must not be compared solely on bag price.

The price history engine calculates:

- absolute price change;
- percentage inflation or deflation;
- cheapest observed region;
- average monthly feed cost;
- seasonal price averages;
- latest verified price versus stale or historical price.
