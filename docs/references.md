# References

Vendor threat-intelligence publications used in problem scoping, plus standards and RAG/ML background. Format can be converted to the department's required style (IEEE, Harvard, APA) in the final report; URLs are canonical.

Entries marked **(held-out)** must not be ingested into the evaluation corpus `no-chaindrop`.

## A. Campaign primary sources

### A.1 Shai-Hulud (September 2025)

1. Kurmi, A. (2025, September 15). *Shai-Hulud: Self-replicating worm compromises 500+ NPM packages*. StepSecurity. https://www.stepsecurity.io/blog/ctrl-tinycolor-and-40-npm-packages-compromised
2. CISA. (2025, September 23). *Widespread supply chain compromise impacting npm ecosystem*. https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem
3. Cyber Security Agency of Singapore. (2025). *Ongoing supply chain attack involving npm packages* (AL-2025-093). https://www.csa.gov.sg/alerts-and-advisories/alerts/al-2025-093/
4. Unit 42, Palo Alto Networks. (2025, September; updated November 26). *"Shai-Hulud" worm compromises npm ecosystem in supply chain attack*. https://unit42.paloaltonetworks.com/npm-supply-chain-attack/
5. Wiz Research. (2025, September). *Shai-Hulud npm supply chain attack*. https://www.wiz.io/blog/shai-hulud-npm-supply-chain-attack
6. Sysdig Threat Research. (2025). *Shai-Hulud: The novel self-replicating worm infecting hundreds of NPM packages*. https://www.sysdig.com/blog/shai-hulud-the-novel-self-replicating-worm-infecting-hundreds-of-npm-packages
7. ReversingLabs. (2025). *Shai-Hulud npm supply chain attack: What you need to know*. https://www.reversinglabs.com/blog/shai-hulud-worm-npm-supply-chain-compromise (title as cited in CISA / vendor round-ups; confirm URL at citation freeze)
8. Socket. (2025, September 16). *Updated and ongoing supply chain attack targets CrowdStrike npm packages*. https://socket.dev/blog/ongoing-supply-chain-attack-targets-crowdstrike-npm-packages

### A.2 Shai-Hulud 2.0 (November 2025)

9. Datadog Security Labs. (2025). *The Shai-Hulud 2.0 npm worm: analysis, and what you need to know*. https://securitylabs.datadoghq.com/articles/shai-hulud-2.0-npm-worm/
10. Datadog. *Indicators of compromise — shai-hulud-2.0*. https://github.com/DataDog/indicators-of-compromise/tree/main/shai-hulud-2.0
11. Securelist / Kaspersky. (2025). *Nothing to steal? Let's wipe. We're analyzing the Shai Hulud 2.0 npm worm*. https://securelist.com/shai-hulud-2-0/118214/
12. Zscaler ThreatLabz. (2025). *Shai-Hulud V2: npm supply chain attack analysis*. https://www.zscaler.com/blogs/security-research/shai-hulud-v2-poses-risk-npm-supply-chain
13. Cycode. (2025). *Shai-Hulud 2.0 deep dive and actionable steps you should take*. https://cycode.com/blog/shai-hulud-2-0-deep-dive-and-actionable-steps-you-should-take/
14. Wiz. (2025). *Shai-Hulud 2.0 investigation / aftermath*. https://www.wiz.io/blog/shai-hulud-2-0-ongoing-supply-chain-attack

### A.3 Mini Shai-Hulud (April–May 2026)

15. Tenable. (2026). *Mini Shai-Hulud supply chain attack CVE-2026-45321 FAQ*. https://www.tenable.com/blog/mini-shai-hulud-frequently-asked-questions
16. Wiz. *Mini Shai-Hulud strikes again: TanStack + more npm packages compromised.* (URL as published by Wiz at citation freeze)
17. Akamai. *Mini Shai-Hulud: The worm returns and goes public.* (URL as published at citation freeze)
18. OX Security. *Shai-Hulud outbreak debrief / new actors deploy Shai-Hulud clones.* (URL as published at citation freeze)
19. Orca Security. (2026). *TanStack and 160+ npm/PyPI packages compromised in supply chain worm attack*. https://orca.security/resources/blog/tanstack-npm-supply-chain-worm/
20. CVE-2026-45321 and GitHub Security Advisory GHSA-g7cv-rxg3-hmpx (TanStack). https://nvd.nist.gov/vuln/detail/CVE-2026-45321 (confirm at freeze)
21. TanStack. *npm supply chain compromise postmortem* (router issue / blog as published).
22. TrustedSec. *Shai-Hulud is back…* (IOC tables; URL as published at citation freeze)
23. Sonatype. (2026). *Mini Shai-Hulud npm attack: more than 2,200 components impacted*. https://www.sonatype.com/blog/mini-shai-hulud-npm-attack-more-than-2200-components-impacted

### A.4 ChainDrop (August 2026) — **(held-out)**

24. StepSecurity. (2026, August 4). *ChainDrop npm worm: Bun-loaded CI/CD credential harvester with Ethereum dead-drop C2*. https://www.stepsecurity.io/blog/chaindrop-npm-worm
25. Microsoft Threat Intelligence. (2026, August 4). *ChainDrop supply chain compromise: Anatomy of a self-propagating worm*. https://www.microsoft.com/en-us/security/blog/2026/08/04/chaindrop-supply-chain-compromise-anatomy-self-propagating-worm/
26. Elastic Security Labs. (2026, August 6). *Shai-Hulud strikes again: CHAINDROP worm hits 400+ npm packages*. https://www.elastic.co/security-labs/shai-hulud-chaindrop-npm-supply-chain
27. Unit 42. (2026, August 6). *ChainDrop: Inside a self-propagating npm worm*. https://unit42.paloaltonetworks.com/chaindrop-npm-worm-analysis/
28. Zscaler ThreatLabz. (2026). *Tracking Shai-Hulud: Inside the ChainDrop npm worm*. https://www.zscaler.com/blogs/security-research/tracking-shai-hulud-inside-chaindrop-npm-worm

## B. Registry and CI defenses

29. GitHub Changelog. (2026, July 28). *npm publish-time malware scanning and dual-use metadata*. https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/
30. SLSA. *Supply-chain Levels for Software Artifacts*. https://slsa.dev/
31. Sigstore. *Overview*. https://www.sigstore.dev/
32. npm. *Trusted publishing (OIDC)*. (docs.npmjs.com; version at freeze)
33. GitHub Security Lab. *Keeping your GitHub Actions and workflows secure*. https://securitylab.github.com/research/

## C. ATT&CK and detection background

34. MITRE ATT&CK. Techniques T1195.002, T1059.007, T1546, T1552.001, T1528, T1567.001, T1105, T1027, T1485, T1078, T1608. https://attack.mitre.org/
35. OWASP. *GitHub Actions security cheat sheet*. https://cheatsheetseries.owasp.org/

## D. RAG, LLMs, and classifiers (method)

36. Lewis, P., et al. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. *NeurIPS*.
37. Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. *KDD*.
38. Lundberg, S. M., & Lee, S.-I. (2017). A unified approach to interpreting model predictions. *NeurIPS* (SHAP).
39. Anthropic. *Claude API documentation* (current at implementation time).
40. LlamaIndex / LangChain documentation (choose one at ADR time).

## E. Additional proposal-listed vendors

Confirm final URLs at bibliography freeze:

- Datadog Security Labs — original "worm compromises hundreds of popular npm packages" article (generation 1 companion to item 9).
- Unit 42 — "The npm threat landscape: attack surface and mitigations."
- ReversingLabs, Akamai, OX Security, TrustedSec — as in §A.

## Citation freeze

The final report will snapshot access dates. Until then, prefer the URLs above over mirrors. ChainDrop items (A.4) stay out of `corpus-v*-no-chaindrop`.
