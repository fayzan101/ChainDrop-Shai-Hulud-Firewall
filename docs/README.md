# SentryHulud documentation

This folder is the source of truth for the final-year project **SentryHulud: A RAG-Augmented AI Firewall for Detecting Self-Propagating npm Supply-Chain Worms in CI/CD Pipelines**.

Start with the [project proposal](proposal.md) if you need the full academic framing. Start with [architecture](architecture.md) if you are implementing a pipeline stage.

## Academic / FYP

| Document | Contents |
| --- | --- |
| [proposal.md](proposal.md) | Abstract, problem, objectives, scope, design summary, deliverables |
| [literature-review.md](literature-review.md) | Worm lineage, existing defenses, RAG for security, research gap |
| [srs.md](srs.md) | Software requirements (functional, non-functional, interfaces) |
| [methodology.md](methodology.md) | Data, stages 1–9, RAG construction, policy, feedback |
| [evaluation.md](evaluation.md) | Held-out-generation protocol, ablations, metrics |
| [dataset.md](dataset.md) | Corpus design, labels, split rules, licensing |
| [timeline.md](timeline.md) | Semester 1–2 milestones and Gantt |
| [community.md](community.md) | Discoverability and contributor path (no star-farming) |
| [implementation-phases.md](implementation-phases.md) | Engineering build order, exit criteria, start-here |
| [technology-stack.md](technology-stack.md) | Languages and services by layer |
| [glossary.md](glossary.md) | Project terms |
| [report-outline.md](report-outline.md) | Final report and defense structure |
| [progress-report-s1-template.md](progress-report-s1-template.md) | Semester 1 progress report skeleton |
| [references.md](references.md) | Bibliography (vendor TI, standards, RAG/ML) |

## Design

| Document | Contents |
| --- | --- |
| [architecture.md](architecture.md) | Nine-stage pipeline, data flow, deployment |
| [threat-model.md](threat-model.md) | Assets, adversaries, STRIDE, trust boundaries |
| [ethics.md](ethics.md) | Responsible malware research and dual-use limits |
| [adr/](adr/) | Architecture Decision Records |

## Engineering (implementation phase)

| Document | Contents |
| --- | --- |
| [installation.md](installation.md) | Local, sandbox, and CI bootstrap |
| [developer-guide.md](developer-guide.md) | How to extend each stage |
| [user-guide.md](user-guide.md) | Analyst dashboard and verdict review |
| [github-action.md](github-action.md) | Composite action inputs, outputs, policy gates |
| [api.md](api.md) | Backend resources and verdict schema |

## Reading order for examiners

1. [proposal.md](proposal.md)
2. [literature-review.md](literature-review.md)
3. [architecture.md](architecture.md)
4. [evaluation.md](evaluation.md)
5. [references.md](references.md)
