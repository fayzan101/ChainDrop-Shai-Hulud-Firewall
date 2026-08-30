# Dashboard (Phase 7)

Analyst console for reviewing quarantine/block verdicts. Feedback must not mutate the held-out split.

## Run locally

Start the API first (see [api/README.md](../api/README.md)), then:

```bash
cd dashboard
npm ci
export SENTRYHULUD_API_URL=http://127.0.0.1:3001
npm run dev
```

Open http://localhost:3000/queue.

## Design

The UI is intentionally minimal: system fonts, tables, and form controls only. No decorative components or marketing chrome. Analysts review justification text, citations, and sandbox indicators, then record `confirm-malicious`, `false-positive`, or `needs-more-data` feedback.

## Build

```bash
npm run build
```
