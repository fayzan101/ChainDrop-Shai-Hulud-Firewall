import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertSafeDockerArgs,
  dockerAvailable,
  FORBIDDEN_DOCKER_MOUNTS,
  runInSandbox,
  buildSandboxImage,
} from "./run.mjs";

const sandboxDir = dirname(fileURLToPath(import.meta.url));
const root = join(sandboxDir, "..");

test("assertSafeDockerArgs rejects docker socket mounts", () => {
  assert.throws(
    () =>
      assertSafeDockerArgs([
        "run",
        "-v",
        "/var/run/docker.sock:/var/run/docker.sock",
        "img",
      ]),
    /docker\.sock/,
  );
});

test("run.mjs docker argv hardens container and forbids socket mounts", () => {
  const src = readFileSync(join(sandboxDir, "run.mjs"), "utf8");
  assert.ok(
    FORBIDDEN_DOCKER_MOUNTS.includes("/var/run/docker.sock"),
    "documents forbidden socket mount",
  );
  assert.doesNotMatch(
    src,
    /-v[\s\S]*docker\.sock/,
    "docker run must not mount the host socket",
  );
  assert.match(src, /--network[\s\S]*none/, "sandbox uses network=none");
  assert.match(src, /--read-only/, "sandbox uses read-only rootfs");
});

test("run.mjs does not execute fixture scripts with node on the host", () => {
  const src = readFileSync(join(sandboxDir, "run.mjs"), "utf8");
  assert.doesNotMatch(
    src,
    /spawn\(\s*["']node["']/,
    "host must not spawn node to run untrusted scripts",
  );
  assert.match(
    src,
    /spawn\(cmd, args/,
    "host orchestrates docker only",
  );
});

test("docker sandbox records canary read and socket attempt", async (t) => {
  if (!(await dockerAvailable())) {
    t.skip("docker not available");
    return;
  }
  await buildSandboxImage();
  const log = await runInSandbox({
    scriptPath: join(root, "fixtures/sandbox-canary-hit/script.js"),
    scriptId: "fixture-sandbox-canary-hit",
    timeoutMs: 8000,
  });
  assert.equal(log.behavior_log_version, "1.0.0");
  assert.ok(log.canary_hits.length >= 1);
  assert.ok(log.net.length >= 1);
  assert.equal(log.canary_hits[0].canary_id, "npm_token");
});

test("docker sandbox timeout still emits partial BehaviorLog", async (t) => {
  if (!(await dockerAvailable())) {
    t.skip("docker not available");
    return;
  }
  await buildSandboxImage();
  const log = await runInSandbox({
    scriptPath: join(root, "fixtures/sandbox-canary-hit/hang.js"),
    scriptId: "fixture-sandbox-hang",
    timeoutMs: 1000,
  });
  assert.equal(log.timeout, true);
  assert.ok(log.canary_hits.length >= 1, "partial log retains canary hit");
});
