CREATE TABLE IF NOT EXISTS nutrition_data.product_versions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  version TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  source_checksum TEXT NOT NULL,
  product JSONB NOT NULL,
  change_classification TEXT,
  changed_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  previous_version_id TEXT
);

CREATE INDEX IF NOT EXISTS product_versions_product_idx ON nutrition_data.product_versions(product_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS nutrition_data.availability_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,
  evidence_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_name TEXT,
  verified_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  confidence TEXT NOT NULL,
  delivery_mode TEXT,
  note TEXT
);

CREATE INDEX IF NOT EXISTS availability_evidence_product_country_idx ON nutrition_data.availability_evidence(product_id, country);
CREATE INDEX IF NOT EXISTS availability_evidence_staleness_idx ON nutrition_data.availability_evidence(expires_at);

CREATE TABLE IF NOT EXISTS nutrition_data.distributor_stockists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,
  locality TEXT,
  delivery_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  online BOOLEAN NOT NULL DEFAULT false,
  physical BOOLEAN NOT NULL DEFAULT false,
  manufacturer_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_url TEXT NOT NULL,
  last_verified_at TIMESTAMPTZ NOT NULL,
  confidence TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nutrition_data.price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  package_size TEXT NOT NULL,
  retailer TEXT,
  country TEXT NOT NULL,
  promotional BOOLEAN NOT NULL DEFAULT false,
  captured_at TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ,
  tax_included BOOLEAN,
  delivery_excluded BOOLEAN,
  confidence TEXT NOT NULL,
  source_url TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS price_observations_product_country_idx ON nutrition_data.price_observations(product_id, country, captured_at DESC);

CREATE TABLE IF NOT EXISTS nutrition_data.product_documents (
  id TEXT PRIMARY KEY,
  product_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  url TEXT NOT NULL,
  checksum TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  document_date DATE,
  parser_version TEXT NOT NULL,
  pages JSONB,
  extraction_method TEXT NOT NULL,
  confidence TEXT NOT NULL,
  text_excerpt TEXT
);

CREATE TABLE IF NOT EXISTS nutrition_data.product_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product_id TEXT NOT NULL,
  target_product_id TEXT NOT NULL,
  type TEXT NOT NULL,
  evidence_url TEXT,
  confidence TEXT NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS nutrition_data.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  canonical_product_id TEXT NOT NULL,
  country TEXT NOT NULL,
  formulation_region TEXT,
  local_name TEXT,
  local_packaging JSONB NOT NULL DEFAULT '[]'::jsonb,
  local_currency TEXT,
  differs_from_canonical BOOLEAN NOT NULL DEFAULT false,
  difference_summary TEXT
);

CREATE TABLE IF NOT EXISTS nutrition_data.operational_issues (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  target_id TEXT,
  message TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS nutrition_data.operational_runs (
  id TEXT PRIMARY KEY,
  worker TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  checkpoint_key TEXT,
  summary JSONB,
  error TEXT
);

CREATE TABLE IF NOT EXISTS nutrition_data.operational_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  target_id TEXT,
  run_after TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  payload JSONB
);

CREATE TABLE IF NOT EXISTS nutrition_data.checkpoints (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nutrition_data.locks (
  key TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL
);
