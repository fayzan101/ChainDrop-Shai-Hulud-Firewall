# Methodology

This document describes how SentryHulud will be built and how evidence will be produced. Experimental protocol details live in [evaluation.md](evaluation.md); data ethics and labeling live in [dataset.md](dataset.md).

## 1. Research stance

The project is both an **engineering artifact** (a CI firewall) and a **measurement study** (does RAG help on an unseen worm generation?). Those goals are kept from contaminating each other:

- Production may eventually ingest ChainDrop intelligence.
- The published generalization result uses a **frozen corpus and model** that never saw ChainDrop documents or samples.

## 2. Data collection and labeling

### 2.1 Benign corpus

Lifecycle scripts sampled from high-download npm packages via the public registry API, plus well-known install helpers (`node-gyp`, `esbuild` postinstall, etc.). Inclusion rules:

- Package has a lockfile-era version published **before** each campaign's public disclosure *or* is independently verified clean.
- Script is captured from the tarball, not from a live install.
- Deduplicate by SHA-256 of script bytes.

### 2.2 Malicious corpus

Deobfuscated **descriptions**, published IOCs, and — where vendors or maintainers have already released samples under terms that allow research use — hashed artifacts. Sources listed in [references.md](references.md): StepSecurity, Datadog Security Labs, Wiz, Tenable, OX Security, Akamai, Unit 42, TrustedSec, ReversingLabs, Microsoft, Elastic, CISA, CSA Singapore, and others.

Each sample is labeled:

| Field | Values |
| --- | --- |
| `campaign` | `shai-hulud` / `shai-hulud-2.0` / `mini-shai-hulud` / `chaindrop` |
| `generation` | 1–4 |
| `label` | `malicious` |
| `split` | `train` / `val` / `heldout` |
| `source_url` | vendor or advisory URL |
| `hook` | `preinstall` / `install` / `postinstall` |

**Split rule:** `chaindrop` ⇒ `heldout` only. Generations 1–3 are stratified into train/val (e.g. 80/20 by package, not by file, to avoid leaking near-duplicate droppers).

### 2.3 What is not collected

- Unpublished 0-day payloads
- Real victim secrets
- Live dead-drop repository contents beyond what vendors already quoted

## 3. Pipeline construction (maps to architecture stages)

Work proceeds in the order of the [timeline](timeline.md): interceptor and features first, then classifier, then sandbox, then LLM/RAG, then policy and dashboard, then the frozen evaluation.

### 3.1 Interceptor

Implement a GitHub composite/JS action that:

1. Reads `package-lock.json` / `npm-shrinkwrap.json` / `pnpm-lock.yaml` / `yarn.lock`
2. Fetches tarballs to a cache keyed by integrity
3. Extracts `package.json` scripts and referenced files
4. Emits `ScriptBundle` JSON for downstream stages

### 3.2 Features and classifier

- Train XGBoost/LightGBM on generations 1–3 + benign.
- Tune decision thresholds on val to bound FPR (NFR-08).
- Export SHAP explainer for dashboard use.
- Serialize `model_version` + `feature_schema_version`.

### 3.3 Sandbox

Stand up a gVisor runtime, canary layout, sinkhole, and `BehaviorLog` schema. Validate with **synthetic** scripts that read canaries and open dummy sockets — not with live worms on a laptop.

Malicious detonation for the paper happens only on the isolated host, after the sandbox has passed an escape-smoke test (see [ethics.md](ethics.md)).

### 3.4 LLM summarization

Prompt templates are versioned. They ask for JSON capabilities and observables. Secret regexes run first. Token limits cap script size; remainder is hashed.

### 3.5 RAG knowledge base

1. Collect vendor HTML/PDF/markdown **as published**.
2. Chunk (~500–800 tokens, 80-token overlap), tag metadata.
3. Embed ATT&CK technique pages used in mappings (see below).
4. Store in Chroma or pgvector with `corpus_version`.
5. Build two collections: `with-chaindrop` (production, post-experiment) and `no-chaindrop` (evaluation).

Query at inference: embed `BehaviorSummary`, retrieve top-k, pass to the reasoner with an instruction to cite or abstain.

### 3.6 Verdict and policy

Reasoner JSON is schema-validated. Invalid JSON ⇒ quarantine. Policy thresholds are config, not prompt text, so they cannot be prompt-injected.

### 3.7 Feedback

Dashboard writes to `feedback_labels`. A documented notebook/job retrains the classifier; corpus updates are reviewed PRs, not automatic LLM self-writes.

## 4. ATT&CK mapping (technique-level RAG)

The reasoner may only emit technique IDs from this closed list unless an analyst extends it. Mapping is based on **public** campaign behavior, not unpublished TTPs.

| ID | Name | Lineage evidence (public) |
| --- | --- | --- |
| T1195.002 | Supply Chain Compromise: Compromise Software Supply Chain | All generations |
| T1059.007 | Command and Scripting Interpreter: JavaScript | Lifecycle payloads |
| T1546 | Event Triggered Execution | npm install hooks |
| T1552.001 | Unsecured Credentials: Credentials In Files | `.npmrc`, cloud files, env |
| T1528 | Steal Application Access Token | npm, GitHub, OIDC |
| T1552.004 | Unsecured Credentials: Private Keys | SSH / signing keys |
| T1078 | Valid Accounts | Stolen publish tokens |
| T1105 | Ingress Tool Transfer | TruffleHog, Bun download |
| T1027 | Obfuscated Files or Information | `bun_environment.js`, `Math_Symbol.js` |
| T1567.001 | Exfiltration Over Web Service: Exfiltration to Code Repository | GitHub dead-drop repos |
| T1567 | Exfiltration Over Web Service | webhook.site and successors |
| T1583.006 | Acquire Infrastructure: Web Services | C2 domains; Ethereum contract rotation (ChainDrop, described at technique level) |
| T1543 | Create or Modify System Process | Self-hosted runner persistence (2.0) |
| T1485 | Data Destruction | Dead-man wiper |
| T1608 | Stage Capabilities | Republish of poisoned tarballs |

ChainDrop's blockchain C2 is retrieved as **C2 agility / web-service staging**, not as a how-to for EtherHiding.

## 5. Policy enforcement

The reasoner emits `risk_score` ∈ [0, 100]. The engine applies:

| Score | Default action | CI effect |
| --- | --- | --- |
| 0–39 | allow | Continue; log verdict |
| 40–80 | quarantine | Fail deploy; keep artifacts; notify |
| 81–100 | block | Fail job immediately |

Hard independent trips (canary exfil, confirmed republish probe against the sink) can raise the action regardless of LLM score.

## 6. Validity threats and mitigations

| Threat | Mitigation |
| --- | --- |
| Duplicate droppers inflate recall | Split by package / campaign cluster, not by file |
| Benign set too easy (only `node-gyp`) | Include messy real postinstalls from popular packages |
| LLM memorized ChainDrop from pretraining | Report this limitation; rely on retrieval ablation and date-cut prompts; compare (b) vs (c) |
| Sandbox not representative of GitHub-hosted runners | Document differences; canary paths mirror GHA layout where possible |
| Vendor reports leak into "held-out" via shared IOCs | Exclude **documents** tagged ChainDrop; shared hashes that appear in older reports stay, and are disclosed |
| Prompt injection | Schema validation, citation requirement, ignore script-embedded "ignore previous instructions" |

## 7. Implementation notes (stack)

As specified in the proposal: GitHub Actions + Node interceptor; Python classifier; Docker/gVisor sandbox; Claude + embeddings + Chroma/pgvector; NestJS + PostgreSQL; Next.js dashboard; Prometheus/Grafana. Substitutions are allowed if they preserve the SRS interfaces and are recorded as ADRs.
