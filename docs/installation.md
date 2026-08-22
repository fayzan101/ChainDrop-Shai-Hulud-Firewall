# Installation

Phase 0 is in the repo (`npm test`, pytest stubs). Later phases fill each package. Commands below are the bootstrap story as components land.

## Prerequisites

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | 20 LTS or newer | Interceptor and GitHub Action |
| Python | 3.11+ | Classifier, evaluation harness |
| Docker | 24+ with gVisor or a dedicated Linux VM | Sandbox |
| Git | 2.40+ | Pinning the Action to a SHA |
| (Optional) PostgreSQL | 16+ | Org-mode API |
| (Optional) Anthropic API key | — | Stages 5 and 7 |

Do not install malware samples on the same machine you use for daily development. See [ethics.md](ethics.md).

## Clone

```bash
git clone <this-repo-url> Sentryhulud
cd Sentryhulud
```

## Environment

Copy `.env.example` when it exists. Required variables (planned):

```
ANTHROPIC_API_KEY=
EMBEDDING_API_KEY=
DATABASE_URL=
SENTRYHULUD_CORPUS_VERSION=no-chaindrop
SENTRYHULUD_FAIL_OPEN=false
```

Never put real npm or GitHub tokens in `.env` for sandbox testing. Use canaries only.

## Python (classifier / eval)

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r classifier/requirements.txt
```

## Node (Action / API / dashboard)

```bash
npm install
```

Monorepo layout may use npm workspaces (`action/`, `api/`, `dashboard/`). Follow the root `package.json` when added.

## Sandbox image

```bash
docker build -t sentryhulud-sandbox:dev sandbox/
```

Verify gVisor:

```bash
docker run --rm --runtime=runsc sentryhulud-sandbox:dev echo ok
```

If `runsc` is missing, use the isolated VM fallback documented in [timeline.md](timeline.md) and write an ADR.

## GitHub Action (consumer repo)

Pin to a commit SHA, not `main`:

```yaml
- uses: <org>/Sentryhulud@<full-commit-sha>
  with:
    policy: default
    corpus-version: no-chaindrop
```

Full inputs: [github-action.md](github-action.md).

## Health checks (when implemented)

```bash
npm run test:interceptor
pytest classifier/tests
npm run test:api
```

Evaluation (research machine only):

```bash
python eval/run_heldout.py --config all --corpus-version no-chaindrop
```

That command must refuse to start if ChainDrop documents are present in the vector store.

## Dashboard (org-mode)

```bash
# api
npm run start:api
# dashboard
npm run dev:dashboard
```

Default UI: `http://localhost:3000` (analyst login TBD).
