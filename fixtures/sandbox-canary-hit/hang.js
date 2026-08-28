/**
 * Long-running synthetic script for timeout partial-log tests (container only).
 */

const fs = require("node:fs");

fs.readFileSync("/home/sandbox/.npmrc", "utf8");

setInterval(() => {}, 60_000);
