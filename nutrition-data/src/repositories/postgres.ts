import { Pool, type PoolClient, type PoolConfig } from "pg";
import type { NutritionDataRepository, ProductSearchQuery } from "../adapters/repository";
import type { AvailabilityRecord, FeedProduct, Manufacturer, Recommendation, VersionRecord } from "../domain/types";
import type { EventPublisher, NutritionDataEvent } from "../events/events";
import type {
  AvailabilityEvidence,
  DistributorStockist,
  ImmutableProductVersion,
  OperationalIssue,
  OperationalQueueItem,
  OperationalRunRecord,
  PriceObservation,
  ProductDocument,
  ProductRelationship,
  ProductVariantRecord
} from "../operations/types";

export class PostgresNutritionDataRepository implements NutritionDataRepository {
  readonly pool: Pool;

  constructor(config: PoolConfig | Pool) {
    this.pool = config instanceof Pool ? config : new Pool(config);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async upsertManufacturer(manufacturer: Manufacturer): Promise<"created" | "updated"> {
    const existing = await this.getManufacturer(manufacturer.id);
    await this.pool.query(
      `INSERT INTO nutrition_data.manufacturers
       (id, name, country_code, regions_supplied, website, supported_products, update_frequency, collection_method, confidence, source_urls, connector_health, version_history, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         country_code = EXCLUDED.country_code,
         regions_supplied = EXCLUDED.regions_supplied,
         website = EXCLUDED.website,
         supported_products = EXCLUDED.supported_products,
         update_frequency = EXCLUDED.update_frequency,
         collection_method = EXCLUDED.collection_method,
         confidence = EXCLUDED.confidence,
         source_urls = EXCLUDED.source_urls,
         connector_health = EXCLUDED.connector_health,
         version_history = EXCLUDED.version_history,
         updated_at = now()`,
      [
        manufacturer.id,
        manufacturer.name,
        manufacturer.countryCode,
        json(manufacturer.regionsSupplied),
        manufacturer.website,
        json(manufacturer.supportedProducts ?? []),
        manufacturer.updateFrequency,
        manufacturer.collectionMethod,
        manufacturer.confidence,
        json(manufacturer.sourceUrls),
        manufacturer.connectorHealth,
        json(manufacturer.versionHistory ?? [])
      ]
    );
    return existing ? "updated" : "created";
  }

  async getManufacturer(id: string): Promise<Manufacturer | undefined> {
    const result = await this.pool.query(`SELECT * FROM nutrition_data.manufacturers WHERE id = $1`, [id]);
    return result.rows[0] ? manufacturerFromRow(result.rows[0]) : undefined;
  }

  async listManufacturers(): Promise<Manufacturer[]> {
    const result = await this.pool.query(`SELECT * FROM nutrition_data.manufacturers ORDER BY name`);
    return result.rows.map(manufacturerFromRow);
  }

  async upsertProduct(product: FeedProduct): Promise<"created" | "updated"> {
    const existing = await this.getProduct(product.id);
    await this.pool.query(
      `INSERT INTO nutrition_data.feed_products
       (id, manufacturer_id, manufacturer_name, brand, name, product_code, category, sub_category, suitability, packaging, prices, availability, nutrients, ingredients, feeding_directions, warnings, storage, images, version_history, source_urls, provenance, confidence, discontinued, metadata, last_updated_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,now())
       ON CONFLICT (id) DO UPDATE SET
         manufacturer_id = EXCLUDED.manufacturer_id,
         manufacturer_name = EXCLUDED.manufacturer_name,
         brand = EXCLUDED.brand,
         name = EXCLUDED.name,
         product_code = EXCLUDED.product_code,
         category = EXCLUDED.category,
         sub_category = EXCLUDED.sub_category,
         suitability = EXCLUDED.suitability,
         packaging = EXCLUDED.packaging,
         prices = EXCLUDED.prices,
         availability = EXCLUDED.availability,
         nutrients = EXCLUDED.nutrients,
         ingredients = EXCLUDED.ingredients,
         feeding_directions = EXCLUDED.feeding_directions,
         warnings = EXCLUDED.warnings,
         storage = EXCLUDED.storage,
         images = EXCLUDED.images,
         version_history = EXCLUDED.version_history,
         source_urls = EXCLUDED.source_urls,
         provenance = EXCLUDED.provenance,
         confidence = EXCLUDED.confidence,
         discontinued = EXCLUDED.discontinued,
         metadata = EXCLUDED.metadata,
         last_updated_at = EXCLUDED.last_updated_at,
         updated_at = now()`,
      productParams(product)
    );
    return existing ? "updated" : "created";
  }

  async getProduct(id: string): Promise<FeedProduct | undefined> {
    const result = await this.pool.query(`SELECT * FROM nutrition_data.feed_products WHERE id = $1`, [id]);
    return result.rows[0] ? productFromRow(result.rows[0]) : undefined;
  }

  async listProducts(query: ProductSearchQuery = {}): Promise<FeedProduct[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (!query.includeDiscontinued) clauses.push(`discontinued = false`);
    if (query.manufacturerId) {
      values.push(query.manufacturerId);
      clauses.push(`manufacturer_id = $${values.length}`);
    }
    if (query.text) {
      values.push(`%${query.text.toLowerCase()}%`);
      clauses.push(`(lower(name) LIKE $${values.length} OR lower(manufacturer_name) LIKE $${values.length} OR lower(coalesce(brand,'')) LIKE $${values.length})`);
    }
    if (query.country) {
      values.push(JSON.stringify([query.country]));
      clauses.push(`availability->'countries' @> $${values.length}::jsonb`);
    }
    if (query.categories?.length) {
      values.push(query.categories);
      clauses.push(`category = ANY($${values.length})`);
    }
    if (query.updatedAfter) {
      values.push(query.updatedAfter);
      clauses.push(`last_updated_at > $${values.length}`);
    }
    const limit = typeof query.limit === "number" ? Math.max(0, query.limit) : undefined;
    const offset = typeof query.offset === "number" ? Math.max(0, query.offset) : undefined;
    const sql = `SELECT * FROM nutrition_data.feed_products ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY manufacturer_name, name${limit !== undefined ? ` LIMIT ${limit}` : ""}${offset !== undefined ? ` OFFSET ${offset}` : ""}`;
    const result = await this.pool.query(sql, values);
    return result.rows.map(productFromRow);
  }

  async markProductDiscontinued(productId: string, version: VersionRecord): Promise<void> {
    await this.pool.query(
      `UPDATE nutrition_data.feed_products
       SET discontinued = true,
           availability = jsonb_set(availability, '{discontinued}', 'true'::jsonb, true),
           version_history = version_history || $2::jsonb,
           updated_at = now()
       WHERE id = $1`,
      [productId, json([version])]
    );
  }

  async saveRecommendation(recommendation: Recommendation): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.recommendations (id, type, title, reason, evidence, confidence, cost_impact, nutritional_impact, availability, product_id, priority, imported)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, reason = EXCLUDED.reason, evidence = EXCLUDED.evidence, confidence = EXCLUDED.confidence, cost_impact = EXCLUDED.cost_impact, nutritional_impact = EXCLUDED.nutritional_impact, availability = EXCLUDED.availability, product_id = EXCLUDED.product_id, priority = EXCLUDED.priority, imported = EXCLUDED.imported`,
      [recommendation.id, recommendation.type, recommendation.title, recommendation.reason, json(recommendation.evidence), recommendation.confidence, json(recommendation.costImpact ?? null), json(recommendation.nutritionalImpact), json(recommendation.availability), recommendation.product?.id, recommendation.priority, recommendation.imported]
    );
  }

  async listRecommendations(): Promise<Recommendation[]> {
    const result = await this.pool.query(`SELECT * FROM nutrition_data.recommendations ORDER BY priority, id`);
    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      reason: row.reason,
      evidence: row.evidence,
      confidence: row.confidence,
      costImpact: row.cost_impact ?? undefined,
      nutritionalImpact: row.nutritional_impact,
      availability: row.availability,
      priority: Number(row.priority),
      imported: row.imported
    }));
  }

  async recordAvailabilityChange(productId: string, availability: AvailabilityRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.availability_history (product_id, availability)
       VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [productId, json(availability)]
    );
  }

  async saveProductVersion(version: ImmutableProductVersion): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.product_versions (id, product_id, version, captured_at, source_checksum, product, change_classification, changed_fields, previous_version_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [version.id, version.productId, version.version, version.capturedAt, version.sourceChecksum, json(version.product), version.changeClassification, json(version.changedFields), version.previousVersionId]
    );
  }

  async listProductVersions(productId: string): Promise<ImmutableProductVersion[]> {
    const result = await this.pool.query(`SELECT * FROM nutrition_data.product_versions WHERE product_id = $1 ORDER BY captured_at, version`, [productId]);
    return result.rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      version: row.version,
      capturedAt: row.captured_at.toISOString(),
      sourceChecksum: row.source_checksum,
      product: row.product,
      changeClassification: row.change_classification ?? undefined,
      changedFields: row.changed_fields,
      previousVersionId: row.previous_version_id ?? undefined
    }));
  }

  async saveAvailabilityEvidence(evidence: AvailabilityEvidence): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.availability_evidence (product_id, country, region, evidence_type, source_url, source_name, verified_at, expires_at, confidence, delivery_mode, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT DO NOTHING`,
      [evidence.productId, evidence.country, evidence.region, evidence.evidenceType, evidence.sourceUrl, evidence.sourceName, evidence.verifiedAt, evidence.expiresAt, evidence.confidence, evidence.deliveryMode, evidence.note]
    );
  }

  async listAvailabilityEvidence(query: { productId?: string; country?: string; staleBefore?: string } = {}): Promise<AvailabilityEvidence[]> {
    const { sql, values } = where("availability_evidence", [
      query.productId ? ["product_id", query.productId] : false,
      query.country ? ["country", query.country] : false,
      query.staleBefore ? ["expires_at_before", query.staleBefore] : false
    ]);
    const result = await this.pool.query(`SELECT * FROM nutrition_data.availability_evidence ${sql} ORDER BY verified_at DESC`, values);
    return result.rows.map((row) => ({
      productId: row.product_id,
      country: row.country,
      region: row.region ?? undefined,
      evidenceType: row.evidence_type,
      sourceUrl: row.source_url,
      sourceName: row.source_name ?? undefined,
      verifiedAt: row.verified_at.toISOString(),
      expiresAt: row.expires_at?.toISOString(),
      confidence: row.confidence,
      deliveryMode: row.delivery_mode ?? undefined,
      note: row.note ?? undefined
    }));
  }

  async saveDistributorStockist(stockist: DistributorStockist): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.distributor_stockists (id, name, type, country, region, locality, delivery_areas, online, physical, manufacturer_ids, source_url, last_verified_at, confidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,type=EXCLUDED.type,country=EXCLUDED.country,region=EXCLUDED.region,locality=EXCLUDED.locality,delivery_areas=EXCLUDED.delivery_areas,online=EXCLUDED.online,physical=EXCLUDED.physical,manufacturer_ids=EXCLUDED.manufacturer_ids,source_url=EXCLUDED.source_url,last_verified_at=EXCLUDED.last_verified_at,confidence=EXCLUDED.confidence`,
      [stockist.id, stockist.name, stockist.type, stockist.country, stockist.region, stockist.locality, json(stockist.deliveryAreas ?? []), stockist.online, stockist.physical, json(stockist.manufacturerIds), stockist.sourceUrl, stockist.lastVerifiedAt, stockist.confidence]
    );
  }

  async listDistributorStockists(query: { country?: string; manufacturerId?: string } = {}): Promise<DistributorStockist[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (query.country) {
      values.push(query.country);
      clauses.push(`country = $${values.length}`);
    }
    if (query.manufacturerId) {
      values.push(JSON.stringify([query.manufacturerId]));
      clauses.push(`manufacturer_ids @> $${values.length}::jsonb`);
    }
    const result = await this.pool.query(`SELECT * FROM nutrition_data.distributor_stockists ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY name`, values);
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      country: row.country,
      region: row.region ?? undefined,
      locality: row.locality ?? undefined,
      deliveryAreas: row.delivery_areas,
      online: row.online,
      physical: row.physical,
      manufacturerIds: row.manufacturer_ids,
      sourceUrl: row.source_url,
      lastVerifiedAt: row.last_verified_at.toISOString(),
      confidence: row.confidence
    }));
  }

  async savePriceObservation(price: PriceObservation): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.price_observations (product_id, amount, currency, package_size, retailer, country, promotional, captured_at, valid_until, tax_included, delivery_excluded, confidence, source_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT DO NOTHING`,
      [price.productId, price.amount, price.currency, price.packageSize, price.retailer, price.country, price.promotional, price.capturedAt, price.validUntil, price.taxIncluded, price.deliveryExcluded, price.confidence, price.sourceUrl]
    );
  }

  async listPriceObservations(query: { productId?: string; country?: string; staleBefore?: string } = {}): Promise<PriceObservation[]> {
    const { sql, values } = where("price_observations", [
      query.productId ? ["product_id", query.productId] : false,
      query.country ? ["country", query.country] : false,
      query.staleBefore ? ["captured_at_before", query.staleBefore] : false
    ]);
    const result = await this.pool.query(`SELECT * FROM nutrition_data.price_observations ${sql} ORDER BY captured_at`, values);
    return result.rows.map((row) => ({
      productId: row.product_id,
      amount: Number(row.amount),
      currency: row.currency,
      packageSize: row.package_size,
      retailer: row.retailer ?? undefined,
      country: row.country,
      promotional: row.promotional,
      capturedAt: row.captured_at.toISOString(),
      validUntil: row.valid_until?.toISOString(),
      taxIncluded: row.tax_included ?? undefined,
      deliveryExcluded: row.delivery_excluded ?? undefined,
      confidence: row.confidence,
      sourceUrl: row.source_url
    }));
  }

  async saveProductDocument(document: ProductDocument): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.product_documents (id, product_ids, url, checksum, captured_at, document_date, parser_version, pages, extraction_method, confidence, text_excerpt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET product_ids=EXCLUDED.product_ids,url=EXCLUDED.url,checksum=EXCLUDED.checksum,captured_at=EXCLUDED.captured_at,document_date=EXCLUDED.document_date,parser_version=EXCLUDED.parser_version,pages=EXCLUDED.pages,extraction_method=EXCLUDED.extraction_method,confidence=EXCLUDED.confidence,text_excerpt=EXCLUDED.text_excerpt`,
      [document.id, json(document.productIds), document.url, document.checksum, document.capturedAt, document.documentDate, document.parserVersion, json(document.pages ?? null), document.extractionMethod, document.confidence, document.textExcerpt]
    );
  }

  async listProductDocuments(productId?: string): Promise<ProductDocument[]> {
    const values: unknown[] = [];
    const clause = productId ? `WHERE product_ids @> $1::jsonb` : "";
    if (productId) values.push(JSON.stringify([productId]));
    const result = await this.pool.query(`SELECT * FROM nutrition_data.product_documents ${clause} ORDER BY captured_at DESC`, values);
    return result.rows.map((row) => ({
      id: row.id,
      productIds: row.product_ids,
      url: row.url,
      checksum: row.checksum,
      capturedAt: row.captured_at.toISOString(),
      documentDate: row.document_date?.toISOString?.().slice(0, 10) ?? undefined,
      parserVersion: row.parser_version,
      pages: row.pages ?? undefined,
      extractionMethod: row.extraction_method,
      confidence: row.confidence,
      textExcerpt: row.text_excerpt ?? undefined
    }));
  }

  async saveProductRelationship(relationship: ProductRelationship): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.product_relationships (source_product_id, target_product_id, type, evidence_url, confidence, note)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING`,
      [relationship.sourceProductId, relationship.targetProductId, relationship.type, relationship.evidenceUrl, relationship.confidence, relationship.note]
    );
  }

  async listProductRelationships(productId?: string): Promise<ProductRelationship[]> {
    const result = await this.pool.query(
      `SELECT * FROM nutrition_data.product_relationships ${productId ? "WHERE source_product_id = $1 OR target_product_id = $1" : ""}`,
      productId ? [productId] : []
    );
    return result.rows.map((row) => ({
      sourceProductId: row.source_product_id,
      targetProductId: row.target_product_id,
      type: row.type,
      evidenceUrl: row.evidence_url ?? undefined,
      confidence: row.confidence,
      note: row.note ?? undefined
    }));
  }

  async saveProductVariant(variant: ProductVariantRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.product_variants (product_id, canonical_product_id, country, formulation_region, local_name, local_packaging, local_currency, differs_from_canonical, difference_summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [variant.productId, variant.canonicalProductId, variant.country, variant.formulationRegion, variant.localName, json(variant.localPackaging ?? []), variant.localCurrency, variant.differsFromCanonical, variant.differenceSummary]
    );
  }

  async listProductVariants(productId?: string): Promise<ProductVariantRecord[]> {
    const result = await this.pool.query(
      `SELECT * FROM nutrition_data.product_variants ${productId ? "WHERE product_id = $1 OR canonical_product_id = $1" : ""}`,
      productId ? [productId] : []
    );
    return result.rows.map((row) => ({
      productId: row.product_id,
      canonicalProductId: row.canonical_product_id,
      country: row.country,
      formulationRegion: row.formulation_region ?? undefined,
      localName: row.local_name ?? undefined,
      localPackaging: row.local_packaging,
      localCurrency: row.local_currency ?? undefined,
      differsFromCanonical: row.differs_from_canonical,
      differenceSummary: row.difference_summary ?? undefined
    }));
  }

  async saveOperationalIssue(issue: OperationalIssue): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.operational_issues (id, type, severity, target_id, message, source_url, created_at, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET type=EXCLUDED.type,severity=EXCLUDED.severity,target_id=EXCLUDED.target_id,message=EXCLUDED.message,source_url=EXCLUDED.source_url,created_at=EXCLUDED.created_at,resolved_at=EXCLUDED.resolved_at`,
      [issue.id, issue.type, issue.severity, issue.targetId, issue.message, issue.sourceUrl, issue.createdAt, issue.resolvedAt]
    );
  }

  async listOperationalIssues(query: { type?: OperationalIssue["type"]; unresolvedOnly?: boolean } = {}): Promise<OperationalIssue[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (query.type) {
      values.push(query.type);
      clauses.push(`type = $${values.length}`);
    }
    if (query.unresolvedOnly) clauses.push(`resolved_at IS NULL`);
    const result = await this.pool.query(`SELECT * FROM nutrition_data.operational_issues ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY created_at DESC`, values);
    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      severity: row.severity,
      targetId: row.target_id ?? undefined,
      message: row.message,
      sourceUrl: row.source_url ?? undefined,
      createdAt: row.created_at.toISOString(),
      resolvedAt: row.resolved_at?.toISOString()
    }));
  }

  async saveOperationalRun(run: OperationalRunRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.operational_runs (id, worker, status, started_at, finished_at, checkpoint_key, summary, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET worker=EXCLUDED.worker,status=EXCLUDED.status,started_at=EXCLUDED.started_at,finished_at=EXCLUDED.finished_at,checkpoint_key=EXCLUDED.checkpoint_key,summary=EXCLUDED.summary,error=EXCLUDED.error`,
      [run.id, run.worker, run.status, run.startedAt, run.finishedAt, run.checkpointKey, json(run.summary ?? null), run.error]
    );
  }

  async listOperationalRuns(query: { worker?: string; status?: OperationalRunRecord["status"] } = {}): Promise<OperationalRunRecord[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (query.worker) {
      values.push(query.worker);
      clauses.push(`worker = $${values.length}`);
    }
    if (query.status) {
      values.push(query.status);
      clauses.push(`status = $${values.length}`);
    }
    const result = await this.pool.query(`SELECT * FROM nutrition_data.operational_runs ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY started_at DESC`, values);
    return result.rows.map((row) => ({
      id: row.id,
      worker: row.worker,
      status: row.status,
      startedAt: row.started_at.toISOString(),
      finishedAt: row.finished_at?.toISOString(),
      checkpointKey: row.checkpoint_key ?? undefined,
      summary: row.summary ?? undefined,
      error: row.error ?? undefined
    }));
  }

  async enqueueOperationalJob(job: OperationalQueueItem): Promise<void> {
    await this.pool.query(
      `INSERT INTO nutrition_data.operational_jobs (id, type, target_id, run_after, attempts, payload)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET type=EXCLUDED.type,target_id=EXCLUDED.target_id,run_after=EXCLUDED.run_after,attempts=EXCLUDED.attempts,payload=EXCLUDED.payload`,
      [job.id, job.type, job.targetId, job.runAfter, job.attempts, json(job.payload ?? null)]
    );
  }

  async listOperationalJobs(query: { type?: OperationalQueueItem["type"]; dueBefore?: string } = {}): Promise<OperationalQueueItem[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];
    if (query.type) {
      values.push(query.type);
      clauses.push(`type = $${values.length}`);
    }
    if (query.dueBefore) {
      values.push(query.dueBefore);
      clauses.push(`run_after <= $${values.length}`);
    }
    const result = await this.pool.query(`SELECT * FROM nutrition_data.operational_jobs ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY run_after`, values);
    return result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      targetId: row.target_id ?? undefined,
      runAfter: row.run_after.toISOString(),
      attempts: row.attempts,
      payload: row.payload ?? undefined
    }));
  }

  async getCheckpoint(key: string): Promise<string | undefined> {
    const result = await this.pool.query(`SELECT value FROM nutrition_data.checkpoints WHERE key = $1`, [key]);
    return result.rows[0]?.value;
  }

  async setCheckpoint(key: string, value: string): Promise<void> {
    await this.pool.query(`INSERT INTO nutrition_data.checkpoints (key, value, updated_at) VALUES ($1,$2,now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`, [key, value]);
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM nutrition_data.locks WHERE key = $1 AND expires_at <= now()`, [key]);
      const expiresAt = new Date(Date.now() + ttlMs).toISOString();
      const result = await client.query(`INSERT INTO nutrition_data.locks (key, expires_at) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [key, expiresAt]);
      await client.query("COMMIT");
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await rollback(client);
      throw error;
    } finally {
      client.release();
    }
  }

  async releaseLock(key: string): Promise<void> {
    await this.pool.query(`DELETE FROM nutrition_data.locks WHERE key = $1`, [key]);
  }
}

export class PostgresNutritionEventPublisher implements EventPublisher {
  constructor(private readonly pool: Pool) {}

  async publish(event: NutritionDataEvent): Promise<void> {
    const dedupeKey = createEventDedupeKey(event);
    await this.pool.query(
      `INSERT INTO nutrition_data.events (type, occurred_at, payload, dedupe_key)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT DO NOTHING`,
      [event.type, event.occurredAt, json(event), dedupeKey]
    );
  }
}

function productParams(product: FeedProduct): unknown[] {
  return [
    product.id,
    product.manufacturerId,
    product.manufacturerName,
    product.brand,
    product.name,
    product.productCode,
    product.category,
    product.subCategory,
    json({
      suitableDisciplines: product.suitableDisciplines,
      suitableAges: product.suitableAges,
      suitableWorkloads: product.suitableWorkloads,
      suitableHorseTypes: product.suitableHorseTypes
    }),
    json(product.packaging),
    json(product.prices),
    json(product.availability),
    json(product.nutrients),
    json(product.ingredients),
    product.feedingDirections,
    json(product.warnings),
    product.storage,
    json(product.images),
    json(product.versionHistory),
    json(product.sourceUrls),
    json(product.provenance),
    product.confidence,
    product.discontinued ?? false,
    json(product.metadata ?? {}),
    product.lastUpdatedAt
  ];
}

function manufacturerFromRow(row: any): Manufacturer {
  return {
    id: row.id,
    name: row.name,
    countryCode: row.country_code,
    regionsSupplied: row.regions_supplied,
    website: row.website ?? undefined,
    supportedProducts: row.supported_products,
    updateFrequency: row.update_frequency ?? undefined,
    collectionMethod: row.collection_method ?? undefined,
    confidence: row.confidence,
    sourceUrls: row.source_urls,
    connectorHealth: row.connector_health ?? undefined,
    versionHistory: row.version_history
  };
}

function productFromRow(row: any): FeedProduct {
  const suitability = row.suitability ?? {};
  return {
    id: row.id,
    manufacturerId: row.manufacturer_id,
    manufacturerName: row.manufacturer_name,
    brand: row.brand ?? undefined,
    name: row.name,
    productCode: row.product_code ?? undefined,
    category: row.category,
    subCategory: row.sub_category ?? undefined,
    suitableDisciplines: suitability.suitableDisciplines ?? [],
    suitableAges: suitability.suitableAges ?? [],
    suitableWorkloads: suitability.suitableWorkloads ?? [],
    suitableHorseTypes: suitability.suitableHorseTypes ?? [],
    packaging: row.packaging,
    prices: row.prices,
    availability: row.availability,
    nutrients: row.nutrients,
    ingredients: row.ingredients,
    feedingDirections: row.feeding_directions ?? undefined,
    warnings: row.warnings,
    storage: row.storage ?? undefined,
    images: row.images,
    versionHistory: row.version_history,
    sourceUrls: row.source_urls,
    provenance: row.provenance,
    confidence: row.confidence,
    lastUpdatedAt: row.last_updated_at.toISOString(),
    discontinued: row.discontinued,
    metadata: row.metadata
  };
}

function where(_table: string, filters: Array<false | [string, string]>): { sql: string; values: unknown[] } {
  const values: unknown[] = [];
  const clauses: string[] = [];
  for (const filter of filters) {
    if (!filter) continue;
    const [field, value] = filter;
    values.push(value);
    if (field.endsWith("_before")) clauses.push(`${field.replace(/_before$/, "")} <= $${values.length}`);
    else clauses.push(`${field} = $${values.length}`);
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", values };
}

function createEventDedupeKey(event: NutritionDataEvent): string {
  const payload = event as any;
  return [
    event.type,
    payload.product?.id ?? payload.price?.productId ?? "",
    payload.product?.lastUpdatedAt ?? payload.price?.capturedAt ?? "",
    JSON.stringify(payload.changedNutrients ?? payload.price ?? payload.product?.availability ?? {})
  ].join("|");
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

async function rollback(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // ignore rollback failure
  }
}
