import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const sandboxDir = dirname(fileURLToPath(import.meta.url));

test("hooks record net.connect in a child process", () => {
  const workDir = mkdtempSync(join(tmpdir(), "sentryhulud-hooks-"));
  const logPath = join(workDir, "behavior.json");
  const scriptPath = join(workDir, "probe.js");
  writeFileSync(
    scriptPath,
    `const net = require("node:net");
const socket = net.connect({ port: 443, host: "127.0.0.1" });
socket.destroy();
`,
  );

  const hooksPath = join(sandboxDir, "hooks.cjs");
  const result = spawnSync(
    process.execPath,
    ["--require", hooksPath, scriptPath],
    {
      env: {
        ...process.env,
        SENTRYHULUD_SCRIPT_ID: "hooks-probe",
        SENTRYHULUD_LOG_PATH: logPath,
      },
      encoding: "utf8",
      timeout: 5000,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const log = JSON.parse(readFileSync(logPath, "utf8"));
  assert.ok(log.net.length >= 1, "expected net.connect to be recorded");
  assert.equal(log.net[0].host, "127.0.0.1");
  assert.equal(log.net[0].port, 443);

  rmSync(workDir, { recursive: true, force: true });
});
