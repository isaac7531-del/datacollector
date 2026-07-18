# Database

The package ships an in-memory repository for local use and tests. Persistent deployments should apply:

```bash
psql "$DATABASE_URL" -f migrations/001_nutrition_data_engine.sql
```

## Tables

- `nutrition_data.manufacturers`
- `nutrition_data.feed_products`
- `nutrition_data.connector_runs`
- `nutrition_data.recommendations`
- `nutrition_data.events`
- `nutrition_data.availability_history`

The schema stores nested fields as JSONB so additional nutrients, provenance fields, distributor coverage, and regional availability can be added without redesigning the database.
