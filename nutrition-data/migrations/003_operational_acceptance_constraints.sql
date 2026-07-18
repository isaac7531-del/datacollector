ALTER TABLE nutrition_data.events
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS events_dedupe_key_idx
  ON nutrition_data.events(dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS availability_evidence_unique_idx
  ON nutrition_data.availability_evidence(product_id, country, COALESCE(region, ''), evidence_type, source_url);

CREATE UNIQUE INDEX IF NOT EXISTS price_observations_unique_idx
  ON nutrition_data.price_observations(product_id, country, COALESCE(retailer, ''), captured_at, amount, package_size, source_url);

CREATE UNIQUE INDEX IF NOT EXISTS product_relationships_unique_idx
  ON nutrition_data.product_relationships(source_product_id, target_product_id, type);

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_unique_idx
  ON nutrition_data.product_variants(product_id, canonical_product_id, country, COALESCE(formulation_region, ''));

CREATE UNIQUE INDEX IF NOT EXISTS availability_history_unique_idx
  ON nutrition_data.availability_history(product_id, availability);
