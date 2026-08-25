/**
 * Phase 2 static features. Parses JavaScript when possible; never executes it.
 * feature_schema_version: 1.0.0
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const FEATURE_SCHEMA_VERSION = "1.0.0";

const CREDENTIAL_NEEDLES = [
  ".npmrc",
  ".git-credentials",
  ".ssh",
  ".aws/credentials",
  "GITHUB_TOKEN",
  "NPM_TOKEN",
];

const TEXT_APIS = [
  "child_process",
  "https.request",
  "http.request",
  "os.homedir",
  "fs.readFile",
  "fs.readFileSync",
];

/**
 * @param {string} text
 * @returns {number}
 */
export function shannonEntropy(text) {
  if (!text.length) {
    return 0;
  }
  /** @type {Map<string, number>} */
  const freq = new Map();
  for (const ch of text) {
    freq.set(ch, (freq.get(ch) || 0) + 1);
  }
  const n = text.length;
  let h = 0;
  for (const c of freq.values()) {
    const p = c / n;
    h -= p * Math.log2(p);
  }
  return h;
}

/**
 * @param {string} source
 * @returns {number}
 */
function countNeedles(source, needles) {
  const lower = source;
  let n = 0;
  for (const needle of needles) {
    let from = 0;
    while (from <= lower.length) {
      const i = lower.indexOf(needle, from);
      if (i === -1) {
        break;
      }
      n += 1;
      from = i + needle.length;
    }
  }
  return n;
}

/**
 * @param {string} source
 * @returns {boolean}
 */
function downloadAndExecuteShape(source) {
  const net = /https?\.request|\bfetch\s*\(|\bhttps\s*\.|require\(\s*["']https["']/.test(
    source,
  );
  const exec = /\bspawn\b|\bexec\b|\bexecFile\b|\bchmod\b/.test(source);
  return net && exec;
}

/**
 * Walk an Acorn-like ESTree node for API and eval usage.
 * @param {object | null} node
 * @param {object} acc
 */
function walkAst(node, acc) {
  if (!node || typeof node !== "object") {
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      walkAst(child, acc);
    }
    return;
  }
  const type = node.type;
  if (type === "CallExpression" || type === "NewExpression") {
    const callee = node.callee;
    const name = calleeName(callee);
    if (name === "eval") {
      acc.eval_count += 1;
    }
    if (type === "NewExpression" && name === "Function") {
      acc.function_ctor_count += 1;
    }
    if (name === "spawn" || name === "exec" || name === "execFile" || name === "execSync") {
      acc.spawn_count += 1;
    }
    if (name === "fetch" || name.endsWith(".request")) {
      acc.http_count += 1;
    }
    if (name === "readFile" || name === "readFileSync") {
      acc.fs_count += 1;
    }
    if (name === "homedir") {
      acc.homedir_count += 1;
    }
  }
  if (type === "Literal" && typeof node.value === "string") {
    acc.string_literals.push(node.value);
    const len = node.value.length;
    acc.ident_lens.push(len);
  }
  if (type === "Identifier") {
    acc.ident_lens.push(node.name.length);
    if (node.name === "homedir") {
      acc.homedir_count += 1;
    }
  }
  for (const key of Object.keys(node)) {
    if (key === "type" || key === "start" || key === "end" || key === "loc") {
      continue;
    }
    walkAst(node[key], acc);
  }
}

/**
 * @param {object} callee
 * @returns {string}
 */
function calleeName(callee) {
  if (!callee) {
    return "";
  }
  if (callee.type === "Identifier") {
    return callee.name;
  }
  if (callee.type === "MemberExpression") {
    const obj = calleeName(callee.object);
    const prop = callee.property && callee.property.name ? callee.property.name : "";
    return prop ? `${obj}.${prop}` : obj;
  }
  return "";
}

/**
 * @param {string} source
 * @returns {{ ok: boolean, ast: object | null }}
 */
function tryParse(source) {
  try {
    const acorn = require("acorn");
    const ast = acorn.parse(source, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowReturnOutsideFunction: true,
    });
    return { ok: true, ast };
  } catch {
    return { ok: false, ast: null };
  }
}

/**
 * Deterministic feature vector for one lifecycle script body.
 *
 * @param {{ hook: string, source: string }} input
 */
export function extractFeatures(input) {
  const hook = input.hook || "install";
  const source = input.source ?? "";
  const parsed = tryParse(source);
  const acc = {
    eval_count: 0,
    function_ctor_count: 0,
    spawn_count: 0,
    http_count: 0,
    fs_count: 0,
    homedir_count: 0,
    string_literals: [],
    ident_lens: [],
  };
  if (parsed.ok) {
    walkAst(parsed.ast, acc);
  }

  const credential_hits = countNeedles(source, CREDENTIAL_NEEDLES);
  const api_text_hits = countNeedles(source, TEXT_APIS);
  const identMean =
    acc.ident_lens.length === 0
      ? 0
      : acc.ident_lens.reduce((a, b) => a + b, 0) / acc.ident_lens.length;

  const features = {
    feature_schema_version: FEATURE_SCHEMA_VERSION,
    hook,
    unparseable: !parsed.ok,
    entropy: shannonEntropy(source),
    source_length: source.length,
    eval_count: parsed.ok ? acc.eval_count : (source.match(/\beval\s*\(/g) || []).length,
    function_ctor_count: acc.function_ctor_count,
    spawn_count: parsed.ok
      ? acc.spawn_count
      : (source.match(/\bspawn\b|\bexec\b|\bexecFile\b/g) || []).length,
    http_count: parsed.ok ? acc.http_count : (source.match(/\bhttps?\b|\bfetch\s*\(/g) || []).length,
    fs_count: acc.fs_count,
    homedir_count: parsed.ok
      ? acc.homedir_count
      : (source.match(/homedir/g) || []).length,
    credential_hits,
    api_text_hits,
    download_and_execute: downloadAndExecuteShape(source),
    ident_mean_length: identMean,
  };
  features.suspicion_score = suspicionScore(features);
  return features;
}

/**
 * @param {object} f
 * @returns {number}
 */
export function suspicionScore(f) {
  let s = 0;
  s += f.credential_hits * 3;
  s += f.api_text_hits * 2;
  s += f.eval_count * 3;
  s += f.function_ctor_count * 3;
  s += f.spawn_count * 2;
  s += f.http_count;
  s += f.homedir_count * 2;
  if (f.download_and_execute) {
    s += 4;
  }
  return s;
}
