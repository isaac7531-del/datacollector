# Fixture capture and parser regression policy

For every source page or document type supported by a connector, keep:

- minimal sanitised fixture;
- source type;
- capture date;
- expected parsed output;
- checksum;
- parser version.

Where redistribution rights are uncertain:

- prefer structural/synthetic fixtures;
- use live smoke tests gated by an environment variable;
- use download-on-test scripts for authorised live tests;
- do not commit whole historical datasets.

Current status:

- Rechenstelle parser has synthetic unit fixtures and live smoke tests.
- British Eventing parser has synthetic unit fixtures and live smoke tests.
- FEI browser collector has manifest/permission tests only; page adapter fixtures must be added per inspected page type.
