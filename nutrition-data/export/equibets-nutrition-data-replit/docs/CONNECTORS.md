# Connectors

A connector can be added without changing the engine.

```ts
import { createPublicFeedConnector } from "@equibets/nutrition-data";

const connector = createPublicFeedConnector({
  id: "manufacturer-public-json",
  name: "Manufacturer public product feed",
  manufacturer,
  urls: ["https://manufacturer.example/products.json"],
  contentType: "json"
});
```

## Required descriptor fields

- Manufacturer
- Country
- Regions supplied
- Website
- Supported products
- Update frequency
- Collection method
- Product categories
- Version
- Confidence
- Source URLs
- Connector health

## Source rules

Connectors must only access public, authorised content:

- Manufacturer websites
- Official catalogues
- Product PDFs
- Public nutrition sheets and labels
- Ingredient declarations
- Retail/distributor catalogues where public
- Public CSV, Excel, XML, JSON, or APIs

Do not implement login bypass, scrape authenticated systems, or bypass CAPTCHA. Respect robots.txt and source terms where applicable.
