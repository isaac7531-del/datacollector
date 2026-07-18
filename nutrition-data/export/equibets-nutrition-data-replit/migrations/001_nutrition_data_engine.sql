CREATE SCHEMA IF NOT EXISTS nutrition_data;

CREATE TABLE IF NOT EXISTS nutrition_data.manufacturers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  regions_supplied JSONB NOT NULL DEFAULT '[]'::jsonb,
  website TEXT,
  supported_products JSONB NOT NULL DEFAULT '[]'::jsonb,
  update_frequency TEXT,
  collection_method TEXT,
  confidence TEXT NOT NULL,
  source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  connector_health TEXT,
  version_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nutrition_data.feed_products (
  id TEXT PRIMARY KEY,
  manufacturer_id TEXT NOT NULL REFERENCES nutrition_data.manufacturers(id),
  manufacturer_name TEXT NOT NULL,
  brand TEXT,
  name TEXT NOT NULL,
  product_code TEXT,
  category TEXT NOT NULL,
  sub_category TEXT,
  suitability JSONB NOT NULL DEFAULT '{}'::jsonb,
  packaging JSONB NOT NULL DEFAULT '[]'::jsonb,
  prices JSONB NOT NULL DEFAULT '[]'::jsonb,
  availability JSONB NOT NULL,
  nutrients JSONB NOT NULL DEFAULT '{}'::jsonb,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  feeding_directions TEXT,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  storage TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  version_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  provenance JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence TEXT NOT NULL,
  discontinued BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_updated_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feed_products_category_idx ON nutrition_data.feed_products(category);
CREATE INDEX IF NOT EXISTS feed_products_manufacturer_idx ON nutrition_data.feed_products(manufacturer_id);
CREATE INDEX IF NOT EXISTS feed_products_availability_gin_idx ON nutrition_data.feed_products USING gin(availability);
CREATE INDEX IF NOT EXISTS feed_products_nutrients_gin_idx ON nutrition_data.feed_products USING gin(nutrients);

CREATE TABLE IF NOT EXISTS nutrition_data.connector_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS nutrition_data.recommendations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence TEXT NOT NULL,
  cost_impact JSONB,
  nutritional_impact JSONB NOT NULL DEFAULT '{}'::jsonb,
  availability JSONB NOT NULL,
  product_id TEXT,
  priority NUMERIC NOT NULL,
  imported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nutrition_data.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS nutrition_data.availability_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES nutrition_data.feed_products(id),
  availability JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
