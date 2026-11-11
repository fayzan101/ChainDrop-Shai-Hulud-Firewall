# Classifier artifacts

`triage.joblib` / `triage.meta.json` are the frozen synthetic triage model
(`model_version=triage-synth-0.1.0`) used by the Action and CI.

Regenerate locally (do not train inside the Action):

```bash
PYTHONPATH=. python -m classifier.train
```

Do not commit live malware-derived weights. Replace this synthetic pin with the
paper model when the labeled store is ready. Evaluation on synthetic held-out
rows measures the generator until real ChainDrop/OSSF samples are wired.
