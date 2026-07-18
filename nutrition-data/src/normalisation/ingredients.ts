import type { IngredientFact, IngredientTaxonomyGroup, ProductClaim } from "../operations/types";

const INGREDIENT_ALIASES: Record<string, { canonical: string; group: IngredientTaxonomyGroup; aliases: string[] }> = {
  lucerne: { canonical: "alfalfa", group: "fibre", aliases: ["lucerne", "alfalfa"] },
  alfalfa: { canonical: "alfalfa", group: "fibre", aliases: ["lucerne", "alfalfa"] },
  maize: { canonical: "corn", group: "grain", aliases: ["maize", "corn"] },
  corn: { canonical: "corn", group: "grain", aliases: ["maize", "corn"] },
  rapeseed: { canonical: "canola", group: "oil", aliases: ["rapeseed", "canola"] },
  canola: { canonical: "canola", group: "oil", aliases: ["rapeseed", "canola"] },
  "beet pulp": { canonical: "beet pulp", group: "fibre", aliases: ["beet pulp", "sugar beet pulp", "dried beet pulp"] },
  "sugar beet pulp": { canonical: "beet pulp", group: "fibre", aliases: ["beet pulp", "sugar beet pulp", "dried beet pulp"] },
  soya: { canonical: "soybean", group: "protein_meal", aliases: ["soya", "soy", "soybean"] },
  soybean: { canonical: "soybean", group: "protein_meal", aliases: ["soya", "soy", "soybean"] },
  linseed: { canonical: "flaxseed", group: "oil", aliases: ["linseed", "flaxseed"] },
  flaxseed: { canonical: "flaxseed", group: "oil", aliases: ["linseed", "flaxseed"] },
  molasses: { canonical: "molasses", group: "molasses", aliases: ["molasses"] },
  yeast: { canonical: "yeast", group: "yeast", aliases: ["yeast", "actisaf"] }
};

export function parseIngredientList(text: string, sourceUrl?: string): IngredientFact[] {
  const segment = extractIngredientSegment(text);
  if (!segment) return [];
  return segment
    .split(/[,;]\s*/)
    .map((value) => value.trim().replace(/\.$/, ""))
    .filter((value) => value.length > 1)
    .map((ingredient, index) => normaliseIngredient(ingredient, index + 1, sourceUrl));
}

export function extractProductClaims(text: string, sourceUrl?: string): ProductClaim[] {
  const checks: Array<[ProductClaim["key"], RegExp]> = [
    ["cereal_free", /cereal[-\s]?free/i],
    ["molasses_free", /molasses[-\s]?free|no added molasses/i],
    ["soy_free", /soy[-\s]?free|soya[-\s]?free|no added soy/i],
    ["lucerne_free", /lucerne[-\s]?free|alfalfa[-\s]?free/i],
    ["grain_free", /grain[-\s]?free|getreidefrei/i],
    ["fortified", /fortified|vitamin and mineral|mineralised|mineralisiert/i],
    ["prohibited_substance_warning", /prohibited substance|competition safe|doping/i],
    ["gmo_claim", /gmo|gm soya|non[-\s]?gm/i],
    ["organic_claim", /organic|bio-/i]
  ];
  return checks
    .filter(([, regex]) => regex.test(text))
    .map(([key, regex]) => ({
      key,
      value: true,
      sourceText: text.match(regex)?.[0] ?? key,
      sourceUrl,
      confidence: "medium"
    }));
}

function normaliseIngredient(raw: string, order: number, sourceUrl?: string): IngredientFact {
  const lower = raw.toLowerCase();
  const alias = Object.entries(INGREDIENT_ALIASES).find(([key]) => lower.includes(key))?.[1];
  return {
    canonicalName: alias?.canonical ?? lower.replace(/\s+\(.+\)/, ""),
    originalName: raw,
    order,
    taxonomyGroup: alias?.group ?? inferGroup(lower),
    aliases: alias?.aliases ?? [lower],
    sourceUrl,
    confidence: alias ? "high" : "medium"
  };
}

function extractIngredientSegment(text: string): string | undefined {
  const match = text.match(/(?:ingredients|composition|zusammensetzung|includes)\s*:?\s*([\s\S]{20,900}?)(?:\n\s*\n|guaranteed analysis|nutritional|typical analysis|feeding|additives|inhaltsstoffe)/i);
  return match?.[1]?.replace(/\s+/g, " ").trim();
}

function inferGroup(value: string): IngredientTaxonomyGroup {
  if (/oat|barley|wheat|corn|maize|rice|grain|gersten|mais/i.test(value)) return "grain";
  if (/straw|grass|alfalfa|lucerne|beet|fibre|fiber|chaff|hay|luzerne/i.test(value)) return "fibre";
  if (/meal|soya|soy|lupin|sunflower/i.test(value)) return "protein_meal";
  if (/oil|fat|linseed|flax|rapeseed|canola/i.test(value)) return "oil";
  if (/calcium|phosphate|salt|chloride|magnesium|mineral/i.test(value)) return "mineral";
  if (/vitamin|premix/i.test(value)) return "vitamin";
  if (/probiotic|microbial|lactobacillus|bacillus/i.test(value)) return "probiotic";
  if (/yeast|hefe/i.test(value)) return "yeast";
  if (/mint|garlic|herb|fenugreek|thyme|rosemary|kräuter/i.test(value)) return "herb";
  if (/preservative|tocopherol/i.test(value)) return "preservative";
  return "other";
}
