import { describe, expect, it } from "vitest";
import { parseProductPage } from "../../src/parsing/htmlProductParser";
import { parseNutrientDeclaration } from "../../src/normalisation/unitNormalisation";
import { parseIngredientList, extractProductClaims } from "../../src/normalisation/ingredients";
import { parseFeedingRules } from "../../src/feeding/feedingDirections";

const html = `
  <h1>Example Performance Balancer</h1>
  <h2>Guaranteed Analysis</h2>
  <ul>
    <li>Crude Protein (min.) 25%</li>
    <li>Zinc (min.) 730 ppm</li>
    <li>Vitamin A (min.) 60000 IU/lb.</li>
    <li>Digestible Energy 10.5 MJ/kg</li>
  </ul>
  <h2>Ingredients</h2>
  Soya bean meal, dried beet pulp, rapeseed oil, lucerne, vitamin and mineral premix.
  <h2>Feeding Guidelines</h2>
  Feed 400g-1kg/100kg bodyweight per day. Light Work 1 - 2 kg.
  <p>Molasses free and fortified.</p>
  <p>20kg bag</p>
`;

describe("operational parsing", () => {
  it("normalises units while retaining source declaration", () => {
    const fact = parseNutrientDeclaration("Zinc (min.)", "730 ppm", "https://example.test", "Zinc (min.) 730 ppm");
    expect(fact?.canonicalKey).toBe("zinc");
    expect(fact?.normalizedUnit).toBe("mg_per_kg");
    expect(fact?.declarationType).toBe("minimum");
  });

  it("parses product pages into source-backed products", () => {
    const parsed = parseProductPage({
      manufacturerId: "example",
      manufacturerName: "Example Feeds",
      headquartersCountry: "GB",
      countriesMarketed: ["GB"],
      countriesOfficiallyDistributed: ["GB"],
      category: "balancer",
      sourceUrl: "https://example.test/products/balancer",
      htmlOrText: html,
      acquisitionMode: "fully_automated"
    });
    expect(parsed.product.name).toBe("Example Performance Balancer");
    expect(parsed.product.nutrients.crude_protein.value).toBe(25);
    expect(parsed.product.nutrients.zinc.unit).toBe("mg_per_kg");
    expect(parsed.product.packaging[0].size).toBe(20);
    expect(parsed.product.metadata?.availabilityEvidence).toHaveLength(1);
  });

  it("normalises ingredient aliases and product claims", () => {
    const ingredients = parseIngredientList(html);
    expect(ingredients.map((ingredient) => ingredient.canonicalName)).toContain("alfalfa");
    expect(ingredients.map((ingredient) => ingredient.canonicalName)).toContain("canola");
    expect(extractProductClaims(html).map((claim) => claim.key)).toContain("molasses_free");
  });

  it("extracts feeding rules without treating them as requirements", () => {
    const rules = parseFeedingRules(html, "product-1", "https://example.test");
    expect(rules.some((rule) => rule.amount.per === "100kg_bodyweight")).toBe(true);
  });
});
