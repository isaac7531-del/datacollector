# Nutrient Normalisation

The normaliser maps source labels to canonical nutrient IDs while retaining original labels.

Supported source declarations include:

- percent;
- g/kg;
- mg/kg;
- mcg/kg or ug/kg;
- ppm;
- IU/kg;
- IU/lb;
- mg/lb;
- MJ/kg;
- Mcal/lb.

Each extracted nutrient fact stores:

- canonical key;
- original label;
- original value and unit;
- declared basis;
- normalised value and unit;
- conversion method;
- declaration type;
- source URL and source text;
- confidence.

Related nutrient measures are not collapsed. NSC, WSC, ESC, starch and sugar are separate labels when declared separately.

Dry-matter conversion is not inferred unless moisture is known; otherwise the basis remains as-fed and the assumption must be surfaced.
