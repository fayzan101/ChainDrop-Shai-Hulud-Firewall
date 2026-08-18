# Literature review and related work

This review supports the claim in the [proposal](proposal.md): successive Shai-Hulud-lineage worms have outpaced signature, attestation, and registry-gate defenses, and no public tool yet combines lifecycle interception, sandboxed behavior, and RAG-grounded reasoning with a held-out-generation evaluation.

Full citations are in [references.md](references.md).

## 1. Supply-chain worm evolution

### 1.1 Shai-Hulud (September 2025)

The original campaign, disclosed around 15 September 2025, was the first widely reported **self-propagating worm** in the npm ecosystem. Compromised packages (initially including `@ctrl/tinycolor` and later hundreds of others, including CrowdStrike-related packages) shipped a `postinstall` payload that:

- Harvested credentials from the developer or CI environment (TruffleHog-style secret scanning; cloud and GitHub tokens).
- Exfiltrated secrets to attacker-controlled endpoints and to public GitHub repositories named `Shai-Hulud`.
- Used stolen npm tokens to enumerate the victim's other packages and republish trojanized versions.

CISA, CSA Singapore, Unit 42, StepSecurity, Wiz, Socket, Sysdig, and ReversingLabs all documented the same core loop: **lifecycle execution → credential theft → GitHub dead-drop → automated republish**. CISA's alert put the initial impact above 500 packages.

Downstream analyses (Wiz) linked the campaign to earlier GitHub-token theft from the August 2025 s1ngularity / Nx compromise, illustrating how one stolen identity becomes ecosystem-scale poisoning.

### 1.2 Shai-Hulud 2.0 (November 2025)

Shai-Hulud 2.0 ("The Second Coming" / SHA1-Hulud) moved execution **earlier** in the install: a `preinstall` hook (`setup_bun.js`) downloaded or located the Bun runtime and launched a large obfuscated second stage (`bun_environment.js`). Public counts cluster around **700–800 unique packages**, tens of thousands of malicious GitHub repositories, and a destructive **dead-man's switch** that wiped the home directory when GitHub and npm authentication both failed.

New persistence included registering the host as a self-hosted GitHub Actions runner (reported name `SHA1HULUD`) and planting workflow backdoors. Datadog Security Labs, Kaspersky (Securelist), Unit 42, Zscaler, and Cycode published independent technical analyses. This generation established the **Bun-loader + huge obfuscated JS payload** pattern that later variants kept.

### 1.3 Mini Shai-Hulud (April–May 2026)

Mini Shai-Hulud, attributed publicly to TeamPCP and tracked in the TanStack wave as **CVE-2026-45321** (CVSS 9.6), changed **initial access**. Rather than depending on a stolen long-lived npm token at the first victim, the TanStack compromise chained:

1. A `pull_request_target` workflow executing untrusted fork code.
2. GitHub Actions **cache poisoning**.
3. Extraction of **OIDC tokens from runner memory** and exchange against npm's trusted-publishing endpoint.

Result: 84 malicious versions across 42 `@tanstack/*` packages in about six minutes on 11 May 2026, all carrying **valid SLSA Build Level 3 / Sigstore provenance** because the publisher was the legitimate CI identity. The campaign also hit `@uipath/*`, Mistral AI SDKs, OpenSearch JS client, and PyPI packages (`mistralai`, `guardrails-ai`), with public tallies above 160–170 packages in 48 hours.

This generation is the project's canonical evidence that **provenance is not a malware oracle**: it attests *who built the artifact*, not *whether the build was hijacked*.

### 1.4 ChainDrop (4 August 2026)

ChainDrop (also styled CHAINDROP) is treated as a heavily evolved descendant of Mini Shai-Hulud / Shai-Hulud 2.0. StepSecurity reported **444 packages and 2,212 versions in under four hours**, starting from a compromised `keyv` maintainer / trusted-publishing path (`keyv@6.0.0`, plus high-download cache packages such as `flat-cache` and `file-entry-cache`). Microsoft, Elastic, Unit 42, and Zscaler corroborate 400+ poisoned packages and a Bun `preinstall` dropper plus a large obfuscated second stage.

Distinctive mutations relative to earlier generations (as published):

- **Ethereum smart-contract C2** (EtherHiding-style domain rotation), defeating static domain blocklists.
- Encrypted exfiltration and GitHub repos tagged with descriptions such as "Shai-Hulud: Here We Go Again".
- Persistence into AI developer tooling (Claude Code, VS Code, Copilot workflow files).
- Broader secret collection (Kubernetes, HashiCorp Vault, CI runner memory).

GitHub enabled **npm publish-time malware scanning** on 28 July 2026. ChainDrop landed on 4 August 2026. The project's problem statement treats this as evidence that registry-side scanning, like signatures, is still a **reactive** control against a worm that mutates loaders and C2.

## 2. Existing defensive approaches

Industry mitigations fall into three buckets. Each has a documented gap against this lineage.

### 2.1 Reactive signatures and IOC feeds

Vendor blogs and IOC repositories (hashes of `bundle.js`, `setup_bun.js`, `Math_Symbol.js`, known repo descriptions, webhook domains) enable fast blocking of **known** versions. They fail on:

- New obfuscation passes and renamed droppers.
- Packages published minutes after a new generation starts (ChainDrop's four-hour blast).
- Behavioral reuse that does not share byte-level signatures.

Hash allow/deny lists are still used as a cheap first filter in SentryHulud, but they are not the verdict.

### 2.2 Provenance and attestation (SLSA, Sigstore, trusted publishing)

SLSA Build Level 3 and npm trusted publishing (OIDC) were intended to guarantee that a package came from a reviewed CI workflow. Mini Shai-Hulud and ChainDrop both abused **the legitimate pipeline**: once the workflow or maintainer GitHub identity is hijacked, the attestation is cryptographically valid and operationally useless as a malware detector.

SentryHulud therefore treats provenance as **metadata**, not as a green light.

### 2.3 Policy controls and registry scanning

- `--ignore-scripts` / npm versions that refuse unapproved lifecycle scripts reduce attack surface but break legitimate packages that still need `node-gyp` and similar install hooks.
- Dependency allowlists work for slow-moving internal apps and fail for most open-source product development.
- GitHub's July 2026 publish-time scanner adds delay and a hold/block path, and dual-use `contentPolicy` metadata. ChainDrop's subsequent success is the working assumption that **install-time, consumer-side** inspection remains necessary.

Related commercial and research detectors (Socket, StepSecurity Harden-Runner, Falco/Sysdig runtime rules, hash-based Shai-Hulud 2.0 scanners) are complementary. None of the public tools combine **pre-execution interception + sandbox + RAG-grounded, explainable CI verdicts** with a **held-out generation** study on this family.

## 3. Retrieval-augmented generation for security

RAG grounds LLM outputs in retrieved documents rather than parametric memory alone. That matters when threat intelligence turns over faster than model training cycles (new IOCs, new C2, new loader names). Security applications already use RAG for alert triage, CVE explanation, and playbook retrieval.

For malicious-script detection, RAG allows **reasoning by analogy**: "this summary matches documented preinstall Bun loaders, TruffleHog-class secret walks, and GitHub repo dead-drops even though the file names and C2 channel differ." Unlike a black-box classifier, the verdict can cite retrieved chunks (campaign, ATT&CK technique, date), which is required for CI adoption where false positives cost developer time.

Risks the project must control (see [ethics.md](ethics.md) and [threat-model.md](threat-model.md)):

- Hallucinated technique IDs.
- Over-weighting retrieved IOCs that no longer apply.
- Prompt injection from malicious script comments into the reasoner.
- Data leakage of private CI logs into a third-party LLM API.

Mitigations: structured JSON schema, citation requirement, corpus versioning, redaction of secrets before any LLM call, and a classifier/sandbox gate so the LLM is not the first or only control.

## 4. Static and dynamic analysis of npm install hooks

Academic and industry work on malicious npm packages typically uses:

- `package.json` metadata (maintainer age, download velocity, script presence).
- AST / API-call features (`child_process`, `https`, `fs` on `~/.npmrc` and `.ssh`).
- Entropy and obfuscation scores.
- Dynamic traces in containers.

SentryHulud reuses this feature family for **triage**, then spends sandbox and LLM budget only on the uncertain class. The novel composition is the **RAG verdict** and the **generation-held-out** evaluation, not a new AST trick.

## 5. Gap addressed by this project

No existing public tool:

1. Intercepts lifecycle scripts across the install graph **before** they run in GitHub Actions,
2. Combines cheap ML triage with credential-free behavioral detonation,
3. Reasons with a **versioned** threat-intel corpus so an unseen generation can be excluded at training time, and
4. Emits an **explainable** allow / quarantine / block decision suitable for a CI gate.

The evaluation is designed to give a defensible answer to whether retrieval-grounded reasoning beats static classification on a real, evolving worm family.

## 6. Implications for SentryHulud design

| Finding from the literature | Design consequence |
| --- | --- |
| Hooks moved from `postinstall` to `preinstall` | Intercept all three lifecycle names; do not assume postinstall-only |
| Loaders download Bun or TruffleHog | Sandbox must record process spawn + egress, not just file hashes |
| Provenance can be valid on malware | Policy must not short-circuit on SLSA success |
| C2 moved to GitHub, then Ethereum | RAG should match **techniques**, not only domains |
| Wiper / dead-man switch | Sandbox must not use real home directories or real tokens |
| Four-hour ecosystem blast | CI gate has to be automatic; human review is the quarantine path, not the hot path |
