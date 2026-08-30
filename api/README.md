# API (Phase 7)

NestJS verdict store for org-mode persistence. Contract: [docs/api.md](../docs/api.md).

## Run locally

```bash
cd api
npm ci
export SQLITE_PATH=./data/sentryhulud.sqlite
npm run start:dev
```

PostgreSQL: set `DATABASE_URL=postgresql://…` instead of `SQLITE_PATH`.

Optional auth: `SENTRYHULUD_API_TOKEN` (bearer token on `Authorization` header).

## OpenAPI / Swagger

With the API running:

- **Swagger UI:** http://127.0.0.1:3001/docs
- **OpenAPI JSON:** http://127.0.0.1:3001/docs/openapi.json
- **OpenAPI YAML:** http://127.0.0.1:3001/docs/openapi.yaml

Export committed specs to the repo root:

```bash
npm run openapi:export
```

Writes `docs/openapi.yaml` and `docs/openapi.json`.

## Endpoints

- `POST /v1/scans` — ingest scan verdicts from the Action (`action/post-scan.mjs`)
- `GET /v1/verdicts` — analyst queue
- `POST /v1/verdicts/:id/feedback` — analyst override (held-out split preserved)
- `GET /v1/corpus/health` — corpus pin health (delegates to `rag.health` when Python is available)

## Tests

```bash
npm test
```
