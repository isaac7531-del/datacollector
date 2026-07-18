import type { ManufacturerSourceConfig, SourceReconnaissance } from "../operations/types";

export const priorityCountryCodes = ["AU", "GB", "IE", "DE", "NZ", "US"] as const;

export const launchManufacturerSourceConfigs: ManufacturerSourceConfig[] = [
  {
    id: "mitavite-au",
    manufacturerName: "Mitavite",
    headquartersCountry: "AU",
    website: "https://mitavite.com",
    countriesMarketed: ["AU"],
    countriesOfficiallyDistributed: ["AU"],
    defaultCurrency: "AUD",
    acquisitionMode: "fully_automated",
    collectionMethod: "public_page",
    productCategories: ["feed", "performance_feed", "balancer", "stud_feed", "youngstock_feed"],
    catalogueUrls: ["https://mitavite.com/collections/feeds"],
    sitemapUrls: ["https://mitavite.com/sitemap_products_1.xml"],
    productUrlPatterns: ["mitavite\\.com/products/"],
    excludeProductUrlPatterns: ["mitavite\\.com/products/hygain-"],
    fallbackProductUrls: [
      "https://mitavite.com/products/mitavite-formula-3",
      "https://mitavite.com/products/mitavite-athleteplus",
      "https://mitavite.com/products/cool-vitality",
      "https://mitavite.com/products/horse-pony",
      "https://mitavite.com/products/mitavite-promita"
    ],
    expectedRefreshDays: 30,
    termsNotes: "Public Shopify catalogue/product pages; robots probe required before collection."
  },
  {
    id: "dengie-gb",
    manufacturerName: "Dengie",
    headquartersCountry: "GB",
    website: "https://dengie.com",
    countriesMarketed: ["GB", "IE"],
    countriesOfficiallyDistributed: ["GB", "IE"],
    defaultCurrency: "GBP",
    acquisitionMode: "fully_automated",
    collectionMethod: "public_page",
    productCategories: ["forage", "chaff", "alfalfa", "hay", "feed"],
    catalogueUrls: ["https://dengie.com/horse-feeds/"],
    sitemapUrls: ["https://dengie.com/product-sitemap.xml", "https://dengie.com/sitemap_index.xml"],
    productUrlPatterns: ["dengie\\.com/horse-feeds/"],
    fallbackProductUrls: [
      "https://dengie.com/horse-feeds/hi-fi-range/hi-fi-molasses-free/",
      "https://dengie.com/horse-feeds/healthy-range/healthy-hooves-molasses-free/",
      "https://dengie.com/horse-feeds/alfa-a-range/alfa-a-molasses-free/",
      "https://dengie.com/horse-feeds/hi-fi-range/hi-fi-original/",
      "https://dengie.com/horse-feeds/grass-range/meadow-lite-with-herbs/"
    ],
    expectedRefreshDays: 30,
    termsNotes: "Robots.txt allows wildcard crawling and declares sitemap."
  },
  {
    id: "dodson-horrell-gb",
    manufacturerName: "Dodson & Horrell",
    headquartersCountry: "GB",
    website: "https://www.dodsonandhorrell.com",
    countriesMarketed: ["GB", "IE"],
    countriesOfficiallyDistributed: ["GB", "IE"],
    defaultCurrency: "GBP",
    acquisitionMode: "document_assisted",
    collectionMethod: "public_pdf",
    productCategories: ["feed", "balancer", "senior_feed", "vitamin_mineral_supplement"],
    catalogueUrls: ["https://www.dodsonandhorrell.com/product/high-fibre-nuts"],
    sitemapUrls: ["https://www.dodsonandhorrell.com/sitemap.xml"],
    productUrlPatterns: ["dodsonandhorrell\\.com/product/", "dodsonandhorrell\\.com/storage/.+\\.pdf"],
    fallbackProductUrls: [
      "https://www.dodsonandhorrell.com/product/high-fibre-nuts",
      "https://www.dodsonandhorrell.com/storage/DH-Equine-Balancer_Performance.pdf",
      "https://www.dodsonandhorrell.com/storage/DH-Equine-Specialist-Nutrition_Safe-And-Sound.pdf",
      "https://www.dodsonandhorrell.com/storage/DH-Equine-Veteran_Sixteen-Plus-Cubes.pdf"
    ],
    documentUrlPatterns: ["\\.pdf$"],
    expectedRefreshDays: 30,
    termsNotes: "Many technical sheets are public PDFs; document-assisted parser required."
  },
  {
    id: "st-hippolyt-de",
    manufacturerName: "St. Hippolyt",
    headquartersCountry: "DE",
    website: "https://www.st-hippolyt.shop",
    countriesMarketed: ["DE", "AT"],
    countriesOfficiallyDistributed: ["DE", "AT"],
    defaultCurrency: "EUR",
    acquisitionMode: "fully_automated",
    collectionMethod: "public_page",
    productCategories: ["feed", "performance_feed", "balancer", "vitamin_mineral_supplement"],
    catalogueUrls: ["https://www.st-hippolyt.shop/"],
    sitemapUrls: ["https://www.st-hippolyt.shop/sitemap.xml"],
    productUrlPatterns: ["st-hippolyt\\.shop/[^/]+$"],
    fallbackProductUrls: [
      "https://www.st-hippolyt.shop/struktur-energetikum"
    ],
    expectedRefreshDays: 30,
    termsNotes: "German-language public product shop pages; parser must support German labels."
  },
  {
    id: "dunstan-nz",
    manufacturerName: "Dunstan",
    headquartersCountry: "NZ",
    website: "https://www.dunstan.co.nz",
    countriesMarketed: ["NZ"],
    countriesOfficiallyDistributed: ["NZ"],
    defaultCurrency: "NZD",
    acquisitionMode: "fully_automated",
    collectionMethod: "public_page",
    productCategories: ["feed", "performance_feed", "breeding_feed", "vitamin_mineral_supplement"],
    catalogueUrls: ["https://www.dunstan.co.nz/"],
    sitemapUrls: ["https://www.dunstan.co.nz/sitemap.xml"],
    productUrlPatterns: ["dunstan\\.co\\.nz/product/details/"],
    fallbackProductUrls: [
      "https://www.dunstan.co.nz/product/details/horse-feed/equestrian/dunstan-salute",
      "https://www.dunstan.co.nz/product/details/horse-feed/equestrian/dunstan-competition-mix"
    ],
    expectedRefreshDays: 30,
    termsNotes: "Public product pages and public datasheets."
  },
  {
    id: "triple-crown-us",
    manufacturerName: "Triple Crown Feed",
    headquartersCountry: "US",
    website: "https://www.triplecrownfeed.com",
    countriesMarketed: ["US"],
    countriesOfficiallyDistributed: ["US"],
    defaultCurrency: "USD",
    acquisitionMode: "fully_automated",
    collectionMethod: "public_page",
    productCategories: ["feed", "senior_feed", "youngstock_feed", "balancer", "forage", "vitamin_mineral_supplement"],
    catalogueUrls: ["https://www.triplecrownfeed.com/products/"],
    sitemapUrls: ["https://www.triplecrownfeed.com/product-sitemap.xml", "https://www.triplecrownfeed.com/sitemap_index.xml"],
    productUrlPatterns: ["triplecrownfeed\\.com/products/[^/]+/"],
    fallbackProductUrls: [
      "https://www.triplecrownfeed.com/products/complete/",
      "https://www.triplecrownfeed.com/products/balancer-gold/",
      "https://www.triplecrownfeed.com/products/senior/",
      "https://www.triplecrownfeed.com/products/growth/"
    ],
    expectedRefreshDays: 30,
    termsNotes: "Robots allows current product pages; old PDF uploads are disallowed by robots and must not be fetched."
  }
];

export const manufacturerTargetReconnaissance: SourceReconnaissance[] = [
  matrix("Mitavite", "AU", "https://mitavite.com/collections/feeds", "Shopify collection with product pages", "19+ feeds visible on collection", "excellent", "all_products", "most_products", "AU product catalogue and state-level notes on some products", "Not required for primary feed pages", "static_html", "Shopify product URLs and possible sitemap", "Robots fetch timed out in this environment; collect only after live robots check.", "fully_automated", "p0", "Launch connector implemented."),
  matrix("Pryde's EasiFeed", "AU", "https://www.prydes.com.au", "Product catalogue pages", "20+", "good", "partial", "partial", "Australia-focused", "Possible PDFs", "mixed", "Unknown", "Requires reconnaissance before implementation.", "administrator_assisted", "p1", "Backlog source."),
  matrix("Hygain", "AU", "https://hygain.com.au", "Shop/product pages", "30+", "good", "partial", "partial", "Australia with international variants", "Possible PDFs", "mixed", "Unknown", "Requires source-specific review.", "administrator_assisted", "p1", "Backlog source."),
  matrix("Barastoc", "AU", "https://barastochorse.com.au", "Product catalogue", "20+", "good", "partial", "partial", "Australia", "Possible PDFs", "mixed", "Unknown", "Requires review.", "administrator_assisted", "p1", "Backlog source."),
  matrix("Dengie", "GB", "https://dengie.com/horse-feeds/", "WordPress/WooCommerce product catalogue", "17 feeds visible", "excellent", "most_products", "most_products", "UK/Ireland marketplace, public prices", "Not required for primary pages", "static_html", "Sitemap and product pages", "Robots allows wildcard crawling.", "fully_automated", "p0", "Launch connector implemented."),
  matrix("Dodson & Horrell", "GB", "https://www.dodsonandhorrell.com", "Product pages plus public PDFs", "Large range", "excellent", "most_products", "most_products", "UK/Ireland plus export", "Yes, technical sheets", "mixed", "PDF storage URLs", "Public PDFs require document workflow.", "document_assisted", "p0", "Launch document-assisted connector implemented."),
  matrix("Baileys Horse Feeds", "GB", "https://www.baileyshorsefeeds.co.uk", "Product pages", "25+", "good", "partial", "partial", "UK", "Possible PDFs", "mixed", "Unknown", "Requires review.", "administrator_assisted", "p1", "Backlog source."),
  matrix("Red Mills", "IE", "https://www.redmills.com", "Product pages", "30+", "good", "partial", "partial", "Ireland/UK/international", "Possible PDFs", "mixed", "Unknown", "Requires review.", "administrator_assisted", "p1", "Backlog source."),
  matrix("St. Hippolyt", "DE", "https://www.st-hippolyt.shop", "German shop product pages", "50+", "excellent", "partial", "all_products", "Germany/Austria", "Not required for primary pages", "static_html", "Shop pages", "Public product pages; German nutrient labels.", "fully_automated", "p0", "Launch connector implemented."),
  matrix("Marstall", "DE", "https://www.marstall.eu", "Product pages", "40+", "good", "partial", "partial", "Germany/EU", "Possible PDFs", "mixed", "Unknown", "Requires review.", "administrator_assisted", "p1", "Backlog source."),
  matrix("Pavo", "DE", "https://www.pavo-horses.com", "Regional product sites", "40+", "good", "partial", "partial", "Europe with regional variants", "Possible PDFs", "mixed", "Unknown", "Good candidate for variant work.", "administrator_assisted", "p1", "Backlog source."),
  matrix("Dunstan", "NZ", "https://www.dunstan.co.nz", "Public NZ product pages and datasheets", "20+", "excellent", "most_products", "partial", "New Zealand", "Yes for some datasheets", "static_html", "Product details URLs", "Public pages visible.", "fully_automated", "p0", "Launch connector implemented."),
  matrix("Fiber Fresh NZ", "NZ", "https://fiber-fresh.com", "Product pages", "10+", "good", "partial", "partial", "New Zealand/Australia variants", "Possible PDFs", "mixed", "Unknown", "Requires review.", "administrator_assisted", "p1", "Backlog source."),
  matrix("Triple Crown Feed", "US", "https://www.triplecrownfeed.com/products/", "WordPress product catalogue", "25+", "excellent", "partial", "partial", "US national retail/distributor network", "Old PDFs disallowed; product pages allowed", "static_html", "Sitemap and product pages", "Robots allows current product pages; old PDF paths disallowed.", "fully_automated", "p0", "Launch connector implemented."),
  matrix("Purina Animal Nutrition", "US", "https://www.purinamills.com/horse-feed", "Product pages", "30+", "good", "partial", "partial", "US", "Possible labels", "mixed", "Unknown", "Requires review.", "administrator_assisted", "p1", "Backlog source."),
  matrix("Nutrena", "US", "https://www.nutrenaworld.com/horse-feed", "Product pages", "30+", "good", "partial", "partial", "US", "Possible labels", "mixed", "Unknown", "Requires review.", "administrator_assisted", "p1", "Backlog source."),
  matrix("Tribute Equine Nutrition", "US", "https://tributeequinenutrition.com", "Product pages", "25+", "good", "partial", "partial", "US", "Possible PDFs", "mixed", "Unknown", "Requires review.", "administrator_assisted", "p1", "Backlog source."),
  matrix("Buckeye Nutrition", "US", "https://www.buckeyenutrition.com", "Product pages", "25+", "good", "partial", "partial", "US", "Possible PDFs", "mixed", "Unknown", "Requires review.", "administrator_assisted", "p1", "Backlog source."),
  matrix("SmartPak", "US", "https://www.smartpakequine.com", "Retail supplement catalogue", "Large", "partial", "partial", "partial", "US retailer availability", "No", "client_rendered", "Retail pages", "Retail source only; not manufacturer verification.", "administrator_assisted", "backlog", "Use only as retailer-confirmed evidence where permitted.")
];

function matrix(
  manufacturer: string,
  country: SourceReconnaissance["country"],
  website: string,
  catalogueStructure: string,
  productCountEstimate: string,
  publicNutrientDataQuality: SourceReconnaissance["publicNutrientDataQuality"],
  feedingRateAvailability: SourceReconnaissance["feedingRateAvailability"],
  ingredientsAvailability: SourceReconnaissance["ingredientsAvailability"],
  geographicalInformation: string,
  downloadablePdfs: string,
  rendering: SourceReconnaissance["rendering"],
  structuredData: string,
  robotsAndTermsObservations: string,
  recommendedConnectorMode: SourceReconnaissance["recommendedConnectorMode"],
  implementationPriority: SourceReconnaissance["implementationPriority"],
  notes: string
): SourceReconnaissance {
  return {
    manufacturer,
    country,
    website,
    catalogueStructure,
    productCountEstimate,
    publicNutrientDataQuality,
    feedingRateAvailability,
    ingredientsAvailability,
    geographicalInformation,
    downloadablePdfs,
    rendering,
    structuredData,
    robotsAndTermsObservations,
    recommendedConnectorMode,
    implementationPriority,
    notes
  };
}
