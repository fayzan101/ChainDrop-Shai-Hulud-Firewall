#!/usr/bin/env node
/**
 * Usage: node interceptor/cli.mjs --dir <path> [--out bundles.json] [--lockfile <file>]
 * Exit 1 when no lockfile is present (fail closed).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { extractFromProject, InterceptorError } from "./extract.mjs";

function parseArgs(argv) {
  const opts = {
    dir: null,
    out: null,
    lockfile: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--dir") {
      opts.dir = argv[++i] ?? null;
    } else if (a === "--out") {
      opts.out = argv[++i] ?? null;
    } else if (a === "--lockfile") {
      opts.lockfile = argv[++i] ?? null;
    } else if (a === "--help" || a === "-h") {
      opts.help = true;
    }
  }
  return opts;
}

export function run(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  const opts = parseArgs(argv);
  if (opts.help) {
    io.stdout.write(
      "Usage: node interceptor/cli.mjs --dir <path> [--out file.json] [--lockfile file]\n",
    );
    return 0;
  }
  const dir = resolve(opts.dir || ".");
  try {
    const result = extractFromProject(dir, {
      lockfile: opts.lockfile ? resolve(opts.lockfile) : undefined,
    });
    const payload = `${JSON.stringify(result, null, 2)}\n`;
    if (opts.out) {
      const outPath = resolve(opts.out);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, payload, "utf8");
    } else {
      io.stdout.write(payload);
    }
    return 0;
  } catch (err) {
    const message = err instanceof InterceptorError ? err.message : String(err);
    io.stderr.write(`${message}\n`);
    if (err instanceof InterceptorError && err.code === "NO_LOCKFILE") {
      return 1;
    }
    return 1;
  }
}

const isDirect =
  process.argv[1] &&
  (process.argv[1].endsWith("cli.mjs") || process.argv[1].endsWith("cli.js"));

if (isDirect) {
  process.exitCode = run(process.argv.slice(2));
}
