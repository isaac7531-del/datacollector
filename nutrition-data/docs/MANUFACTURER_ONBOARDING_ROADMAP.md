# Manufacturer Onboarding Roadmap

The engine now tracks a broader manufacturer onboarding registry beyond the initial live connector cohort.

## Current automated/live-smoke cohort

- Mitavite AU
- Hygain AU
- Pryde's EasiFeed AU
- Barastoc AU
- CopRice AU
- Dengie GB/IE
- Dodson & Horrell GB/IE
- St. Hippolyt DE/AT
- Dunstan NZ
- Triple Crown US

## Onboarded targets awaiting per-source validation

Australia:

- Hygain
- Barastoc
- Pryde's EasiFeed
- CopRice
- KER Australia
- Ranvet
- Kelato
- Poseidon Animal Health
- CEN Nutrition

United Kingdom and Ireland:

- Saracen Horse Feeds
- Baileys Horse Feeds
- Spillers
- Allen & Page
- TopSpec
- Blue Chip
- Equine America UK
- NAF
- Science Supplements
- Thunderbrook
- ForagePlus

Germany and continental Europe:

- Agrobs
- Marstall
- Höveler
- Eggersmann
- Josera
- Derby
- Pavo

France:

- Reverdy
- Lambey
- Dynavena

Italy:

- Equiplanet
- Fioccato

United States:

- Purina Animal Nutrition
- Nutrena
- Tribute Equine Nutrition
- Seminole Feed
- Buckeye Nutrition
- Progressive Nutrition
- SmartPak Supplements

New Zealand:

- Fiber Fresh
- NRM

## Operational rule

Adding a source to the onboarding registry does not make its products verified. Each source remains `administrator_assisted` until source reconnaissance confirms ordinary HTTP viability, robots/terms compatibility, parser stability, nutrient coverage, feeding-direction coverage and availability evidence.

The first Australian connector batch has moved into live-smoke/collection testing:

- Hygain: live discovery works; collection is partial until Shopify nutrient parsing coverage improves.
- Pryde's EasiFeed: live discovery works after excluding non-product pages; collection acceptance remains pending.
- Barastoc: document-assisted PDF discovery and collection work for five public specification sheets.
- CopRice: partial public-page collection works for three product pages; complete catalogue discovery remains pending.
