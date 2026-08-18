# Technology stack

Implementation choices from the proposal. Substitutions require an ADR if they change an SRS interface.

| Layer | Technology | Notes |
| --- | --- | --- |
| CI/CD | GitHub Actions (composite or JS Action), Node npm wrapper | Pin Action to commit SHA |
| Static analysis | Acorn or `@babel/parser`; entropy and API-call features | Parse failure ⇒ escalate |
| ML triage | Python 3.11+, scikit-learn, XGBoost or LightGBM, SHAP | Frozen `model_version` for eval |
| Sandbox | Docker + seccomp + gVisor; eBPF or `strace` | Canary secrets only |
| LLM | Anthropic Claude API | Stages 5 and 7; [ADR 0004](adr/0004-claude-for-verdicts.md) |
| Embeddings | Voyage AI or `bge-large` | Local model for air-gap eval |
| Vector DB | Chroma (local) or pgvector | Two collections: with/without ChainDrop |
| RAG orchestration | LlamaIndex or LangChain | Pick one in Semester 2 week 4 |
| Backend | NestJS, PostgreSQL | Verdicts, feedback, audit |
| Dashboard | Next.js / React | Analyst queue and overrides |
| Monitoring | Prometheus + Grafana | Volume, block rate, latency |

Runtime split: TypeScript on the runner (no untrusted `child_process`), Python for ML/eval/RAG batch jobs.
