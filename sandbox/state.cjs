/**
 * Shared capture state for sandbox hooks (container-only).
 */

const fs = require("node:fs");

const CANARY_MAP = new Map([
  ["/home/sandbox/.npmrc", "npm_token"],
  ["/home/sandbox/.aws/credentials", "aws_key"],
  ["/home/sandbox/.config/gh/hosts.yml", "github_pat"],
]);

function normalizePath(p) {
  try {
    return String(p).replace(/\\/g, "/");
  } catch {
    return String(p);
  }
}

function createBehaviorState(scriptId) {
  const started = Date.now();
  const state = {
    script_id: scriptId,
    started_at: new Date(started).toISOString(),
    processes: [],
    files: [],
    net: [],
    canary_hits: [],
    timeout: false,
    error: null,
    _startedMs: started,
    recordFile(path, operation) {
      const normalized = normalizePath(path);
      this.files.push({ path: normalized, operation });
      const canaryId = CANARY_MAP.get(normalized);
      if (canaryId) {
        const exists = this.canary_hits.some(
          (h) => h.canary_id === canaryId && h.path === normalized,
        );
        if (!exists) {
          this.canary_hits.push({ canary_id: canaryId, path: normalized });
        }
      }
      this.persist();
    },
    recordNet(host, port, protocol = "tcp") {
      this.net.push({
        host: String(host),
        port: Number(port) || 0,
        protocol,
      });
      this.persist();
    },
    recordProcess(command, args) {
      this.processes.push({
        command: String(command),
        args: Array.isArray(args) ? args.map(String) : [],
      });
      this.persist();
    },
    persist() {
      const path = process.env.SENTRYHULUD_LOG_PATH;
      if (!path) {
        return;
      }
      try {
        const payload = JSON.stringify(this.finalize(false));
        const tmp = `${path}.tmp`;
        fs.writeFileSync(tmp, payload);
        fs.renameSync(tmp, path);
      } catch {
        // best-effort while the child is being torn down
      }
    },
    finalize(timeout = false, error = null) {
      const ended = Date.now();
      return {
        behavior_log_version: "1.0.0",
        script_id: this.script_id,
        started_at: this.started_at,
        ended_at: new Date(ended).toISOString(),
        duration_ms: Math.max(0, ended - this._startedMs),
        timeout: Boolean(timeout),
        processes: this.processes,
        files: this.files,
        net: this.net,
        canary_hits: this.canary_hits,
        error,
      };
    },
  };
  return state;
}

module.exports = { CANARY_MAP, createBehaviorState, normalizePath };
