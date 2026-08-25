import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const interceptorDir = dirname(fileURLToPath(import.meta.url));

test("interceptor source never imports child_process or package-manager install", () => {
  const files = readdirSync(interceptorDir).filter((f) => f.endsWith(".mjs"));
  for (const name of files) {
    if (name.endsWith(".test.mjs")) {
      continue;
    }
    const src = readFileSync(join(interceptorDir, name), "utf8");
    assert.doesNotMatch(
      src,
      /child_process/,
      `${name} must not import child_process (would risk executing untrusted scripts)`,
    );
    assert.doesNotMatch(
      src,
      /\b(?:spawn|exec|execFile|execSync|spawnSync|fork)\s*\(/,
      `${name} must not spawn processes`,
    );
    assert.doesNotMatch(
      src,
      /\bnpm\s+install\b|\byarn\s+install\b|\bpnpm\s+install\b/,
      `${name} must not invoke a package manager install`,
    );
  }
});
