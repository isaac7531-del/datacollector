# Manufacturer Target Matrix

Phase 2 launch markets are Australia, United Kingdom, Ireland, Germany, New Zealand, and the United States.

This matrix records technical reconnaissance and recommended acquisition mode. A product must not be exposed as verified unless its nutrient, feeding, ingredient, and availability claims retain traceable source provenance.

| Manufacturer | Country | Website | Catalogue structure | Product count estimate | Public nutrient data | Feeding rates | Ingredients | Geography info | PDFs | Rendering | Structured data | Robots / terms observations | Connector mode | Priority |
|---|---:|---|---|---:|---|---|---|---|---|---|---|---|---|---|
| Mitavite | AU | https://mitavite.com/collections/feeds | Shopify collection/product pages | 19+ visible feeds | Excellent | All/most | Most | AU catalogue; some state notes | Not required | Static HTML | Shopify sitemap/product URLs | Robots fetch timed out in this environment; live connector checks robots before requests | fully automated | P0 |
| Pryde's EasiFeed | AU | https://www.prydes.com.au | Product catalogue | 20+ | Good | Partial | Partial | AU-focused | Possible | Mixed | Unknown | Needs deeper review | administrator-assisted | P1 |
| Hygain | AU | https://hygain.com.au | Shop/product pages | 30+ | Good | Partial | Partial | AU/international variants | Possible | Mixed | Unknown | Needs source review | administrator-assisted | P1 |
| Barastoc | AU | https://barastochorse.com.au | Product catalogue | 20+ | Good | Partial | Partial | Australia | Possible | Mixed | Unknown | Needs source review | administrator-assisted | P1 |
| Dengie | GB/IE | https://dengie.com/horse-feeds/ | WordPress/WooCommerce products | 17 visible feeds | Excellent | Most | Most | UK/Ireland marketplace | Not required | Static HTML | Sitemap/product pages | robots.txt allows wildcard crawling | fully automated | P0 |
| Dodson & Horrell | GB/IE | https://www.dodsonandhorrell.com | Product pages plus public technical PDFs | Large range | Excellent | Most | Most | UK/Ireland and export | Yes | Mixed | PDF storage URLs | Public product sheets require document-assisted parser | document-assisted | P0 |
| Baileys Horse Feeds | GB | https://www.baileyshorsefeeds.co.uk | Product pages | 25+ | Good | Partial | Partial | UK | Possible | Mixed | Unknown | Needs review | administrator-assisted | P1 |
| Red Mills | IE | https://www.redmills.com | Product pages | 30+ | Good | Partial | Partial | IE/UK/international | Possible | Mixed | Unknown | Needs review | administrator-assisted | P1 |
| St. Hippolyt | DE | https://www.st-hippolyt.shop | German shop pages | 50+ | Excellent | Partial | All/most | DE/AT | Not required | Static HTML | Shop pages | Public pages; German label mapping required | fully automated | P0 |
| Marstall | DE | https://www.marstall.eu | Product pages | 40+ | Good | Partial | Partial | DE/EU | Possible | Mixed | Unknown | Needs review | administrator-assisted | P1 |
| Pavo | DE/NL/EU | https://www.pavo-horses.com | Regional product sites | 40+ | Good | Partial | Partial | Regional variants likely | Possible | Mixed | Unknown | Good candidate for variant workflow | administrator-assisted | P1 |
| Dunstan | NZ | https://www.dunstan.co.nz | Product detail pages and datasheets | 20+ | Excellent | Most | Partial | New Zealand | Yes | Static HTML | Product details URLs | Public pages visible | fully automated | P0 |
| Fiber Fresh NZ | NZ | https://fiber-fresh.com | Product pages | 10+ | Good | Partial | Partial | NZ/AU variants possible | Possible | Mixed | Unknown | Needs review | administrator-assisted | P1 |
| Triple Crown Feed | US | https://www.triplecrownfeed.com/products/ | WordPress product catalogue | 25+ | Excellent | Partial | Partial | US national retailers | Old PDFs disallowed | Static HTML | Sitemap/product pages | robots.txt allows product pages but disallows old PDF upload paths | fully automated | P0 |
| Purina Animal Nutrition | US | https://www.purinamills.com/horse-feed | Product pages | 30+ | Good | Partial | Partial | US | Possible labels | Mixed | Unknown | Needs review | administrator-assisted | P1 |
| Nutrena | US | https://www.nutrenaworld.com/horse-feed | Product pages | 30+ | Good | Partial | Partial | US | Possible labels | Mixed | Unknown | Needs review | administrator-assisted | P1 |
| Tribute Equine Nutrition | US | https://tributeequinenutrition.com | Product pages | 25+ | Good | Partial | Partial | US | Possible PDFs | Mixed | Unknown | Needs review | administrator-assisted | P1 |
| Buckeye Nutrition | US | https://www.buckeyenutrition.com | Product pages | 25+ | Good | Partial | Partial | US | Possible PDFs | Mixed | Unknown | Needs review | administrator-assisted | P1 |
| SmartPak | US | https://www.smartpakequine.com | Retail supplement catalogue | Large | Partial | Partial | Partial | US retailer evidence | No | Client-rendered | Retail pages | Retailer evidence only; not manufacturer verification | administrator-assisted | Backlog |

## Launch connector cohort

Implemented source configs currently cover:

- Mitavite AU
- Dengie GB/IE
- Dodson & Horrell GB/IE
- St. Hippolyt DE/AT
- Dunstan NZ
- Triple Crown US

These sources are sufficient to prove real-source collection across the priority regions, but they do **not** yet meet the full Phase 2 acceptance counts of 250 verified products / 19 manufacturers. The connector framework and matrix mark the remaining manufacturers for staged rollout.
