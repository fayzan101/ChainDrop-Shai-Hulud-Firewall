# Contributing to SentryHulud

Thank you for helping build a defensive supply-chain firewall. Read [SECURITY.md](SECURITY.md) before you write or run anything that touches untrusted JavaScript.

## Before you start

1. This project analyzes malware. Dynamic analysis happens **only** in the documented sandbox.
2. Do not add exploit PoCs, worm constructors, or unpublished payload dumps.
3. Do not commit `.env` files, tokens, or unpacked samples.
4. Prefer public vendor IOCs and deobfuscated **descriptions** over redistributing binaries.

## Development workflow

1. Open an issue describing the change (interceptor, classifier, sandbox, RAG, policy, dashboard, or docs).
2. Branch from `main`: `feat/<area>-<short-name>` or `fix/<area>-<short-name>`.
3. Keep PRs small. The interceptor, sandbox, and RAG corpus versioning are easy to review in isolation and dangerous to mix.
4. Update the relevant document under `docs/` in the same PR if behavior or an interface changes.
5. Add or update tests. Classifier changes need a note on whether they invalidate the held-out split (see [docs/evaluation.md](docs/evaluation.md)).

## Code conventions

| Area | Language | Notes |
| --- | --- | --- |
| GitHub Action / interceptor | TypeScript | No `child_process` of untrusted scripts on the runner |
| Classifier / features | Python 3.11+ | scikit-learn / XGBoost; serialize model + feature schema together |
| Sandbox | Docker + gVisor | Destroy after each run; no Docker socket mount |
| API | NestJS | All verdicts persisted with model/corpus versions |
| Dashboard | Next.js | Feedback actions write to the audit log, not directly to production weights |

## Dataset and corpus PRs

- Label every sample with `campaign`, `generation`, `split` (`train` / `heldout`), and `source_url`.
- ChainDrop artifacts stay in the **held-out** split. Do not silently add them to training or to the RAG corpus used for the generalization experiment.
- Corpus chunks need `campaign`, `technique`, `published_at`, and `corpus_version` metadata.

## Review checklist

- [ ] Change cannot execute a lifecycle script outside the sandbox
- [ ] No secrets in logs, fixtures, or commit history
- [ ] Verdict JSON still matches [docs/api.md](docs/api.md)
- [ ] Held-out split integrity preserved
- [ ] Docs updated

## License

Contributions are accepted under the [MIT License](LICENSE).
