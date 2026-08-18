# Security Policy

SentryHulud is a **defensive** CI/CD firewall. It intercepts, analyzes, and optionally blocks npm lifecycle scripts. It is not an offensive toolkit.

## Supported research scope

This project handles untrusted and potentially malicious JavaScript. Treat every lifecycle script as hostile until the pipeline says otherwise.

## Reporting a vulnerability in SentryHulud

Do **not** open a public GitHub issue for product vulnerabilities.

Email the maintainers with:

- Affected component (interceptor, sandbox, API, dashboard, GitHub Action)
- Reproduction against **this** codebase (not against third-party registries or live CI)
- Expected vs actual behavior
- A suggested fix if you have one

We will acknowledge reports within 7 days and aim to ship a fix or mitigation advisory within 30 days for high-severity issues.

## Hard rules for contributors and operators

1. **Never execute captured scripts on a developer workstation or a privileged CI runner.** All dynamic analysis runs inside the isolated sandbox with dummy credentials.
2. **Never commit malware samples, unpacked payloads, or live IOCs that include secrets.** Public vendor reports and hashed IOCs belong in `data/` under the dataset policy in [docs/dataset.md](docs/dataset.md).
3. **Never point the sandbox at a production npm token, GitHub PAT, cloud key, or OIDC identity.** The dry-run environment is seeded with canary secrets only.
4. **Do not use this project to test, probe, or publish packages on the public npm registry.** Evaluation uses a local or air-gapped fixture registry.
5. **Do not generate takedown, phishing, or credential-harvesting content.** Automated takedown of attacker GitHub repos is explicitly out of scope.

## Sandbox assumptions

The sandbox is a containment boundary, not a proof of perfect isolation. Operators must:

- Run it with gVisor or an equivalent userspace kernel, plus a restrictive seccomp profile
- Drop all Linux capabilities
- Block egress except to a recorded sink (fake DNS / HTTP interceptor)
- Mount no host secrets, Docker socket, or CI credential files
- Destroy the container after each analysis

See [docs/threat-model.md](docs/threat-model.md) and [docs/ethics.md](docs/ethics.md).

## Dual-use notice

Feature extractors, deobfuscation prompts, and ATT&CK mappings describe **detector inputs**. They must not be expanded into exploit write-ups, worm constructors, or payload reproduction guides. If a documentation change would help an attacker build a new variant, it does not belong in this repository.
