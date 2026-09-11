/**
 * In-process Prometheus counters for scan throughput / block rate.
 * Labels are limited to config + corpus_version (no secrets).
 */

type CounterKey = string;

function labelKey(labels: Record<string, string>): string {
  const parts = Object.keys(labels)
    .sort()
    .map((key) => `${key}="${escapeLabel(labels[key])}"`);
  return parts.join(",");
}

function escapeLabel(value: string): string {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"');
}

export class PrometheusRegistry {
  private readonly counters = new Map<string, Map<CounterKey, number>>();
  private readonly histogramSums = new Map<string, Map<CounterKey, number>>();
  private readonly histogramCounts = new Map<string, Map<CounterKey, number>>();

  private counterBucket(name: string): Map<CounterKey, number> {
    let bucket = this.counters.get(name);
    if (!bucket) {
      bucket = new Map();
      this.counters.set(name, bucket);
    }
    return bucket;
  }

  inc(name: string, labels: Record<string, string> = {}, amount = 1): void {
    const bucket = this.counterBucket(name);
    const key = labelKey(labels);
    bucket.set(key, (bucket.get(key) ?? 0) + amount);
  }

  observeDuration(
    name: string,
    seconds: number,
    labels: Record<string, string> = {},
  ): void {
    const key = labelKey(labels);
    let sums = this.histogramSums.get(name);
    if (!sums) {
      sums = new Map();
      this.histogramSums.set(name, sums);
    }
    let counts = this.histogramCounts.get(name);
    if (!counts) {
      counts = new Map();
      this.histogramCounts.set(name, counts);
    }
    sums.set(key, (sums.get(key) ?? 0) + seconds);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  recordScan(input: {
    config?: string | null;
    corpus_version?: string | null;
    actions: string[];
    classifier_labels: Array<string | null | undefined>;
    durationSeconds?: number;
  }): void {
    const labels = {
      config: input.config || "unknown",
      corpus_version: input.corpus_version || "unknown",
    };
    this.inc("sentryhulud_scans_total", labels);
    for (const action of input.actions) {
      if (action === "block") {
        this.inc("sentryhulud_blocks_total", labels);
      } else if (action === "quarantine") {
        this.inc("sentryhulud_quarantines_total", labels);
      }
    }
    for (const label of input.classifier_labels) {
      if (label === "escalate") {
        this.inc("sentryhulud_escalations_total", labels);
      }
    }
    if (typeof input.durationSeconds === "number") {
      this.observeDuration(
        "sentryhulud_scan_duration_seconds",
        input.durationSeconds,
        labels,
      );
    }
  }

  render(): string {
    const lines: string[] = [];
    const emitCounter = (name: string, help: string) => {
      lines.push(`# HELP ${name} ${help}`);
      lines.push(`# TYPE ${name} counter`);
      const bucket = this.counters.get(name);
      if (!bucket || bucket.size === 0) {
        lines.push(`${name} 0`);
        return;
      }
      for (const [key, value] of bucket) {
        if (key) {
          lines.push(`${name}{${key}} ${value}`);
        } else {
          lines.push(`${name} ${value}`);
        }
      }
    };

    emitCounter("sentryhulud_scans_total", "Total scans ingested");
    emitCounter("sentryhulud_blocks_total", "Total block verdicts ingested");
    emitCounter(
      "sentryhulud_quarantines_total",
      "Total quarantine verdicts ingested",
    );
    emitCounter(
      "sentryhulud_escalations_total",
      "Total escalate classifier labels ingested",
    );

    lines.push(
      "# HELP sentryhulud_scan_duration_seconds Scan ingest duration in seconds",
    );
    lines.push("# TYPE sentryhulud_scan_duration_seconds summary");
    const sums = this.histogramSums.get("sentryhulud_scan_duration_seconds");
    const counts = this.histogramCounts.get("sentryhulud_scan_duration_seconds");
    if (!sums || sums.size === 0) {
      lines.push("sentryhulud_scan_duration_seconds_sum 0");
      lines.push("sentryhulud_scan_duration_seconds_count 0");
    } else {
      for (const [key, sum] of sums) {
        const count = counts?.get(key) ?? 0;
        const suffix = key ? `{${key}}` : "";
        lines.push(`sentryhulud_scan_duration_seconds_sum${suffix} ${sum}`);
        lines.push(`sentryhulud_scan_duration_seconds_count${suffix} ${count}`);
      }
    }

    return `${lines.join("\n")}\n`;
  }

  reset(): void {
    this.counters.clear();
    this.histogramSums.clear();
    this.histogramCounts.clear();
  }
}

export const prometheusRegistry = new PrometheusRegistry();
