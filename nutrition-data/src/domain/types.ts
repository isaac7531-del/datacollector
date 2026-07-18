export type ISODateString = string;
export type ISODateTimeString = string;
export type CountryCode = string;
export type CurrencyCode = string;

export type ConnectorStatus = "enabled" | "disabled";
export type ConnectorHealthStatus = "healthy" | "degraded" | "unhealthy" | "disabled";
export type CollectionMethod = "official_api" | "public_json" | "public_xml" | "public_csv" | "public_excel" | "public_pdf" | "public_page" | "retail_catalogue" | "manual";
export type ConfidenceLevel = "low" | "medium" | "high" | "verified";

export type ProductCategory =
  | "feed"
  | "performance_feed"
  | "stud_feed"
  | "breeding_feed"
  | "racehorse_feed"
  | "eventing_feed"
  | "dressage_feed"
  | "showjumping_feed"
  | "western_feed"
  | "pony_feed"
  | "senior_feed"
  | "youngstock_feed"
  | "balancer"
  | "vitamin_mineral_supplement"
  | "electrolyte"
  | "joint_supplement"
  | "digestive_supplement"
  | "gut_support"
  | "probiotic"
  | "oil"
  | "omega_product"
  | "protein_supplement"
  | "hoof_supplement"
  | "calming_supplement"
  | "muscle_supplement"
  | "treat"
  | "forage"
  | "hay"
  | "haylage"
  | "lucerne"
  | "alfalfa"
  | "chaff"
  | "beet_pulp"
  | "grain"
  | "salt"
  | "mineral_block"
  | "custom_mix";

export type Discipline = "dressage" | "eventing" | "showjumping" | "racing" | "endurance" | "western" | "showing" | "driving" | "breeding" | "pleasure" | "rehab" | "other";
export type Workload = "maintenance" | "light" | "moderate" | "heavy" | "very_heavy" | "race_training";
export type AgeGroup = "foal" | "weanling" | "yearling" | "youngstock" | "adult" | "senior";
export type HorseType = "pony" | "horse" | "draft" | "warmblood" | "thoroughbred" | "native" | "easy_keeper" | "hard_keeper" | "metabolic" | "other";
export type FeedingGoal = "maintenance" | "weight_gain" | "weight_loss" | "performance" | "low_starch" | "senior_support" | "hoof_support" | "digestive_support" | "breeding" | "growth" | "recovery" | "cost_reduction";

export type NutrientBasis = "as_fed" | "dry_matter";
export type NutrientUnit = "percent" | "g_per_kg" | "mg_per_kg" | "iu_per_kg" | "mcg_per_kg" | "mj_per_kg" | "mcal_per_kg" | "g" | "mg" | "iu" | "mcg" | "ratio" | string;

export interface DataSource {
  id: string;
  name: string;
  kind: CollectionMethod | "manufacturer" | "distributor" | "retailer" | "user_entry";
  official: boolean;
  countryCode?: CountryCode;
  sourceUrl?: string;
  licenceNote?: string;
  robotsPolicy?: "allowed" | "disallowed" | "unknown" | "not_applicable";
}

export interface ProvenanceRecord {
  source: DataSource;
  connectorId: string;
  fetchedAt: ISODateTimeString;
  sourceUrl?: string;
  sourceChecksum?: string;
  rawRecordId?: string;
  importBatchId?: string;
  fieldPath?: string;
  confidence: ConfidenceLevel;
}

export interface NutrientValue {
  key: string;
  label: string;
  value: number;
  unit: NutrientUnit;
  basis: NutrientBasis;
  per?: "kg" | "day" | "serving" | "100g";
  min?: number;
  max?: number;
  sourceText?: string;
  provenance?: ProvenanceRecord[];
  confidence: ConfidenceLevel;
}

export type NutrientMap = Record<string, NutrientValue>;

export interface Ingredient {
  name: string;
  order?: number;
  percentage?: number;
  notes?: string;
  provenance?: ProvenanceRecord[];
}

export interface PackagingOption {
  size: number;
  unit: "kg" | "g" | "lb" | "l" | "ml";
  label?: string;
  barcode?: string;
}

export interface ProductPrice {
  amount: number;
  currency: CurrencyCode;
  packageSize: PackagingOption;
  source?: DataSource;
  distributorId?: string;
  validFrom?: ISODateString;
  validTo?: ISODateString;
  confidence: ConfidenceLevel;
}

export interface Distributor {
  id: string;
  name: string;
  website?: string;
  countries: CountryCode[];
  regions?: string[];
  postalCodePrefixes?: string[];
  sourceUrls?: string[];
}

export interface AvailabilityRecord {
  countries: CountryCode[];
  regions?: string[];
  postalCodePrefixes?: string[];
  distributors?: Distributor[];
  importAvailable?: boolean;
  importRestrictions?: string[];
  shippingRestrictions?: string[];
  seasonalAvailability?: string;
  discontinued?: boolean;
  availabilityConfidence: ConfidenceLevel;
  lastVerifiedAt?: ISODateTimeString;
  source?: DataSource;
}

export interface Manufacturer {
  id: string;
  name: string;
  countryCode: CountryCode;
  regionsSupplied: string[];
  website?: string;
  supportedProducts?: ProductCategory[];
  updateFrequency?: string;
  collectionMethod?: CollectionMethod;
  versionHistory?: VersionRecord[];
  confidence: ConfidenceLevel;
  sourceUrls: string[];
  connectorHealth?: ConnectorHealthStatus;
}

export interface VersionRecord {
  version: string;
  changedAt: ISODateTimeString;
  changeType: "created" | "updated" | "formulation_changed" | "availability_changed" | "price_changed" | "discontinued" | "reactivated";
  summary: string;
  sourceUrl?: string;
  checksum?: string;
}

export interface FeedProduct {
  id: string;
  manufacturerId: string;
  manufacturerName: string;
  brand?: string;
  name: string;
  productCode?: string;
  category: ProductCategory;
  subCategory?: string;
  suitableDisciplines: Discipline[];
  suitableAges: AgeGroup[];
  suitableWorkloads: Workload[];
  suitableHorseTypes: HorseType[];
  packaging: PackagingOption[];
  prices: ProductPrice[];
  availability: AvailabilityRecord;
  nutrients: NutrientMap;
  ingredients: Ingredient[];
  feedingDirections?: string;
  warnings: string[];
  storage?: string;
  images: string[];
  versionHistory: VersionRecord[];
  sourceUrls: string[];
  provenance: ProvenanceRecord[];
  confidence: ConfidenceLevel;
  lastUpdatedAt: ISODateTimeString;
  discontinued?: boolean;
  metadata?: Record<string, unknown>;
}

export interface HorseProfile {
  id?: string;
  species: "horse" | "pony" | "donkey" | "mule";
  breed?: string;
  ageYears: number;
  heightCm?: number;
  weightKg: number;
  bodyConditionScore?: number;
  discipline?: Discipline;
  fitness?: "unfit" | "base" | "fit" | "elite";
  competitionLevel?: "none" | "club" | "regional" | "national" | "international";
  workload: Workload;
  medicalConditions?: string[];
  pastureAccessHours?: number;
  forageQuality?: "poor" | "average" | "good" | "excellent";
  climate?: "temperate" | "hot" | "cold" | "humid" | "arid";
  season?: "spring" | "summer" | "autumn" | "winter";
  pregnancy?: { daysPregnant: number } | null;
  lactation?: { month: number } | null;
  growthStage?: AgeGroup | null;
  travel?: { hoursPerWeek: number } | null;
  recovery?: boolean;
  restDaysPerWeek?: number;
  competitionSchedule?: { startsPerMonth: number; nextCompetitionDate?: ISODateString };
  goals: FeedingGoal[];
  location: HorseLocation;
}

export interface HorseLocation {
  country: CountryCode;
  stateOrProvince?: string;
  region?: string;
  postalCode?: string;
  language?: string;
  unitSystem?: "metric" | "imperial";
  currency?: CurrencyCode;
  allowImportedFeeds?: boolean;
  allowGlobalSearch?: boolean;
}

export interface NutrientRequirement {
  key: string;
  label: string;
  minimum?: number;
  target?: number;
  maximum?: number;
  unit: NutrientUnit;
  basis: "daily";
  rationale: string;
  confidence: ConfidenceLevel;
}

export interface RequirementProfile {
  horse: HorseProfile;
  requirements: Record<string, NutrientRequirement>;
  assumptions: string[];
  generatedAt: ISODateTimeString;
}

export interface FeedingProgramItem {
  id: string;
  productId?: string;
  customName?: string;
  product?: FeedProduct;
  amountPerDay: number;
  unit: "kg" | "g" | "lb" | "scoop" | "serving";
  role: "forage" | "feed" | "supplement" | "pasture" | "treat" | "custom";
  nutrients?: NutrientMap;
  costPerPackage?: ProductPrice;
}

export interface FeedingProgram {
  id?: string;
  horse: HorseProfile;
  items: FeedingProgramItem[];
  currency?: CurrencyCode;
}

export interface NutrientIntake {
  key: string;
  label: string;
  amount: number;
  unit: NutrientUnit;
  contributionByItem: Array<{ itemId: string; amount: number; label: string }>;
}

export interface NutrientBalance {
  key: string;
  label: string;
  intake: number;
  requirement?: NutrientRequirement;
  status: "deficient" | "low" | "adequate" | "excess" | "unknown";
  gap?: number;
  unit: NutrientUnit;
  explanation: string;
}

export interface FeedingProgramAnalysis {
  program: FeedingProgram;
  requirementProfile: RequirementProfile;
  dailyDryMatterKg: number;
  dailyCost: MoneyAmount;
  monthlyCost: MoneyAmount;
  intakes: Record<string, NutrientIntake>;
  balances: Record<string, NutrientBalance>;
  ratios: Record<string, number>;
  warnings: string[];
  interactions: string[];
  generatedAt: ISODateTimeString;
}

export interface MoneyAmount {
  amount: number;
  currency: CurrencyCode;
}

export interface Recommendation {
  id: string;
  type: "increase_nutrient" | "reduce_nutrient" | "replace_product" | "add_product" | "remove_product" | "availability_warning" | "cost_optimisation";
  title: string;
  reason: string;
  evidence: string[];
  confidence: ConfidenceLevel;
  costImpact?: MoneyAmount;
  nutritionalImpact: Record<string, number>;
  availability: AvailabilityRecord;
  product?: FeedProduct;
  priority: number;
  imported: boolean;
}

export interface ProductComparison {
  products: FeedProduct[];
  nutrientKeys: string[];
  rows: Array<{
    productId: string;
    productName: string;
    manufacturerName: string;
    category: ProductCategory;
    nutrients: Record<string, NutrientValue | undefined>;
    costPerKg?: MoneyAmount;
    availabilityRank: number;
  }>;
}

export interface NormalizedNutritionPayload {
  manufacturers: Manufacturer[];
  products: FeedProduct[];
  provenance: ProvenanceRecord[];
  issues: DataQualityIssue[];
}

export interface RawNutritionPayload<TData = unknown> {
  source: DataSource;
  connectorId: string;
  fetchedAt: ISODateTimeString;
  data: TData;
  contentType?: string;
  sourceUrl?: string;
  rawRecordId?: string;
  checksum?: string;
}

export interface DataQualityIssue {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  path?: string;
  source?: DataSource;
}

export interface DiscoveryItem {
  id: string;
  connectorId: string;
  source: DataSource;
  url?: string;
  label?: string;
  countryCode?: CountryCode;
  productCategory?: ProductCategory;
  metadata?: Record<string, unknown>;
}

export interface IngestionRunSummary {
  connectorIds: string[];
  discovered: number;
  payloads: number;
  productsCreated: number;
  productsUpdated: number;
  manufacturersCreated: number;
  manufacturersUpdated: number;
  formulationsChanged: number;
  availabilityChanged: number;
  discontinued: number;
  issues: DataQualityIssue[];
}
