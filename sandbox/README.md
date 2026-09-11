# Sandbox (Phase 5)

Isolated dry-run for evaluation configuration **(b)**: classifier + sandbox heuristic on `BehaviorLog`.

## Layout

| Path | Role |
| --- | --- |
| `Dockerfile` | Non-root image with canary credentials and capture agent |
| `canaries/` | Fake npm / GitHub / AWS tokens (never real secrets) |
| `canaries.example.json` | Documented canary layout (paths + obviously fake values) |
| `capture-agent.cjs` | Runs untrusted script under hooks; emits `BehaviorLog` JSON |
| `run.mjs` | Host orchestrator — **Docker only**, never `node script.js` on the host |
| `policy.mjs` | Map `BehaviorLog` → `allow` / `quarantine` / `block` |
| `cli.mjs` | `node sandbox/cli.mjs --build --script …` helper |

## Build and run

```bash
docker build -t sentryhulud-sandbox:dev sandbox/
node sandbox/cli.mjs --build --script fixtures/sandbox-canary-hit/script.js --policy
```

Prefer gVisor when available (`docker run --runtime=runsc …`). Standard runc is acceptable for CI and dev; document VM fallback in an ADR if `runsc` is unavailable.

## Security invariants

- **No Docker socket mount** — `run.mjs` rejects `/var/run/docker.sock` in argv.
- **Network none** — egress attempts are logged, not routed to the internet.
- **Canary credentials only** — see `canaries/` and [`canaries.example.json`](canaries.example.json). Never copy host `~/.npmrc` into the image.
- **Destroy after each run** — `docker run --rm`.
- **Never execute captured scripts on the developer machine or GHA runner** — only inside the container.

## BehaviorLog

Schema: [`schemas/behavior-log.schema.json`](../schemas/behavior-log.schema.json). Fields: `processes`, `files`, `net`, `canary_hits`, `timeout`.

Fixture example: [`fixtures/sandbox-canary-hit/behavior-log.example.json`](../fixtures/sandbox-canary-hit/behavior-log.example.json).
