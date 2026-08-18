# Dataset card

**Name:** SentryHulud Lifecycle Script Corpus  
**Task:** Binary malicious vs benign npm lifecycle scripts, with campaign labels for held-out-generation evaluation  
**Languages:** JavaScript (lifecycle scripts); English (TI documents)  
**License:** Code MIT; **third-party reports remain under their publishers' copyright**; malware bytes are **not** redistributed in git.

## 1. Motivation

Support training a triage classifier and a RAG index on Shai-Hulud generations 1–3, and a sealed test set from ChainDrop (generation 4), plus a benign npm baseline for false-positive measurement.

## 2. Composition

### 2.1 Script table (`data/scripts/metadata.jsonl`)

One JSON object per captured script (git contains metadata + hashes; raw bytes live in a restricted local/object store).

```json
{
  "script_id": "uuid",
  "sha256": "…",
  "package": "example",
  "version": "1.2.3",
  "hook": "preinstall",
  "label": "benign | malicious",
  "campaign": null,
  "generation": null,
  "split": "train | val | heldout",
  "source_url": "https://…",
  "collected_at": "2026-08-18",
  "notes": "registry sample | vendor IOC"
}
```

For benign rows, `campaign` and `generation` are null.

### 2.2 Document table (`data/corpus/documents.jsonl`)

Chunk parents for RAG:

```json
{
  "doc_id": "uuid",
  "title": "…",
  "url": "https://…",
  "publisher": "StepSecurity",
  "published_at": "2025-09-15",
  "campaign_tags": ["shai-hulud"],
  "exclude_from_heldout_corpus": false
}
```

Any document with `chaindrop` in `campaign_tags` MUST have `exclude_from_heldout_corpus: true`.

### 2.3 Splits

| Split | Allowed campaigns |
| --- | --- |
| train, val | `shai-hulud`, `shai-hulud-2.0`, `mini-shai-hulud`, plus benign |
| heldout | `chaindrop` malicious + reserved benign packages |

## 3. Collection process

1. **Benign:** npm registry API for top-N downloaded packages; download tarballs by integrity; extract `package.json` scripts. Record registry GET time.
2. **Malicious:** only from public advisories, vendor blogs, and IOC repos cited in [references.md](references.md). Prefer hashes + structural features over storing full second-stage blobs in the git repo.
3. **Dedup:** SHA-256 of normalized script bytes (LF newlines).
4. **Manual review:** two-person check on campaign labels for a random 10% of malicious rows.

## 4. Preprocessing

- Strip `Buffer` / ultra-large minified files to a size cap for the LLM path; full bytes remain available to the feature extractor via hash lookup.
- Never commit live tokens if a sample accidentally contains them; rotate and drop the file.

## 5. Distribution and access

| Artifact | In git? |
| --- | --- |
| Metadata JSONL | Yes |
| TI document text that is copyrighted | No — fetch at ingest time from URL list |
| Malware blobs | No — local `data/raw/malicious/` (gitignored) |
| Embeddings | No — rebuild from corpus version |

`data/raw/malicious/README.md` will describe how authorized researchers reconstruct the store from published URLs and hashes (no payload tutorials).

## 6. Known biases

- Vendor write-ups over-represent successful, large campaigns.
- Benign top-N packages under-represent tiny packages with weird install scripts (a likely FP source).
- English-only TI.
- ChainDrop held-out set is one family; success does not imply detection of unrelated malware.

## 7. Maintenance

Corpus versions are tagged (`corpus-v0.1-no-chaindrop`). The evaluation pin never gains ChainDrop docs. Production indexes may.

## 8. Ethical notes

See [ethics.md](ethics.md). Do not scrape private GitHub dead-drop repositories or victim data.
