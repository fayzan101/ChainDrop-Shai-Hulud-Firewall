#!/usr/bin/env node
/**
 * Runs an untrusted script inside the sandbox container and prints BehaviorLog JSON.
 * Never import this on the host — use sandbox/run.mjs to orchestrate Docker.
 */

const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const { createBehaviorState } = require("./state.cjs");

const scriptPath = process.argv[2];
const timeoutMs = Number(process.env.SENTRYHULUD_TIMEOUT_MS || 5000);
const scriptId = process.env.SENTRYHULUD_SCRIPT_ID || path.basename(scriptPath || "script");
const logPath =
  process.env.SENTRYHULUD_LOG_PATH || "/tmp/sentryhulud-behavior.json";
const hooksPath = path.join(__dirname, "hooks.cjs");

if (!scriptPath) {
  process.stderr.write("usage: capture-agent.cjs <script.js>\n");
  process.exit(2);
}

function readPersistedLog(timeout, error = null) {
  if (fs.existsSync(logPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(logPath, "utf8"));
      return { ...parsed, timeout: Boolean(timeout), error };
    } catch {
      // fall through
    }
  }
  return createBehaviorState(scriptId).finalize(timeout, error);
}

function emitLog(timeout, error = null) {
  const log = readPersistedLog(timeout, error);
  process.stdout.write(`${JSON.stringify(log)}\n`);
}

const abs = path.resolve(scriptPath);
try {
  fs.rmSync(logPath, { force: true });
} catch {
  // ignore
}

let timedOut = false;
const child = cp.spawn(
  process.execPath,
  ["--require", hooksPath, abs],
  {
    env: {
      ...process.env,
      SENTRYHULUD_SCRIPT_ID: scriptId,
      SENTRYHULUD_LOG_PATH: logPath,
    },
    stdio: ["ignore", "ignore", "pipe"],
  },
);

let childError = null;
child.stderr.on("data", (chunk) => {
  const text = chunk.toString().trim();
  if (text) {
    childError = text;
  }
});

const timer = setTimeout(() => {
  timedOut = true;
  child.kill("SIGKILL");
}, timeoutMs);

child.on("close", () => {
  clearTimeout(timer);
  emitLog(timedOut, childError);
});
