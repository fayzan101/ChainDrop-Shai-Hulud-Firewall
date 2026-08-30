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

## Endpoints

- `POST /v1/scans` — ingest scan verdicts from the Action (`action/post-scan.mjs`)
- `GET /v1/verdicts` — analyst queue
- `POST /v1/verdicts/:id/feedback` — analyst override (held-out split preserved)
- `GET /v1/corpus/health` — corpus pin health (delegates to `rag.health` when Python is available)

## Tests

```bash
npm test
```
