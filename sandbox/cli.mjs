#!/usr/bin/env node
/**
 * CLI: detonate one script in the sandbox container and write BehaviorLog JSON.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildSandboxImage, dockerAvailable, runInSandbox } from "./run.mjs";
import { decideFromBehaviorLog } from "./policy.mjs";

function parseArgs(argv) {
  const opts = {
    script: null,
    out: "behavior-log.json",
    scriptId: null,
    timeoutMs: 5000,
    image: null,
    build: false,
    policy: false,
    classifierRisk: 0,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--script") opts.script = argv[++i];
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--script-id") opts.scriptId = argv[++i];
    else if (a === "--timeout-ms") opts.timeoutMs = Number(argv[++i]);
    else if (a === "--image") opts.image = argv[++i];
    else if (a === "--build") opts.build = true;
    else if (a === "--policy") opts.policy = true;
    else if (a === "--classifier-risk") opts.classifierRisk = Number(argv[++i]);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.script) {
    process.stderr.write(
      "usage: node sandbox/cli.mjs --script <path> [--out behavior-log.json] [--build] [--policy]\n",
    );
    process.exit(2);
  }

  if (!(await dockerAvailable())) {
    process.stderr.write("docker is not available on this host\n");
    process.exit(1);
  }

  if (opts.build) {
    await buildSandboxImage({ image: opts.image ?? undefined });
  }

  const log = await runInSandbox({
    scriptPath: resolve(opts.script),
    scriptId: opts.scriptId ?? undefined,
    timeoutMs: opts.timeoutMs,
    image: opts.image ?? undefined,
  });

  const payload = opts.policy
    ? { behavior_log: log, verdict: decideFromBehaviorLog(log, { classifierRisk: opts.classifierRisk }) }
    : log;

  writeFileSync(opts.out, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
