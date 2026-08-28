/**
 * Node preload hooks — installed only inside the sandbox container.
 */

const fs = require("node:fs");
const net = require("node:net");
const cp = require("node:child_process");
const { createBehaviorState, normalizePath } = require("./state.cjs");

const scriptId = process.env.SENTRYHULUD_SCRIPT_ID || "unknown";
const state = createBehaviorState(scriptId);
global.__SENTRYHULUD_BEHAVIOR_STATE__ = state;

function wrapFsMethod(name) {
  const original = fs[name];
  if (typeof original !== "function") {
    return;
  }
  fs[name] = function wrapped(...args) {
    const path = args[0];
    if (typeof path === "string" || Buffer.isBuffer(path)) {
      const op = name.includes("write") ? "write" : "read";
      state.recordFile(path, op);
    }
    return original.apply(this, args);
  };
}

for (const method of [
  "readFileSync",
  "readFile",
  "openSync",
  "open",
  "writeFileSync",
  "writeFile",
  "statSync",
  "stat",
]) {
  wrapFsMethod(method);
}

function wrapNetFactory(name) {
  const original = net[name];
  if (typeof original !== "function") {
    return;
  }
  net[name] = function wrapped(...args) {
    let host = "unknown";
    let port = 0;
    if (typeof args[0] === "object" && args[0] !== null) {
      host = args[0].host || args[0].hostname || host;
      port = args[0].port ?? port;
    } else {
      port = args[0];
      host = args[1] || host;
    }
    state.recordNet(host, port, "tcp");
    return original.apply(this, args);
  };
}

wrapNetFactory("connect");
wrapNetFactory("createConnection");

const spawn = cp.spawn;
cp.spawn = function wrappedSpawn(command, args, options) {
  state.recordProcess(command, args);
  return spawn.call(this, command, args, options);
};

const spawnSync = cp.spawnSync;
cp.spawnSync = function wrappedSpawnSync(command, args, options) {
  state.recordProcess(command, args);
  return spawnSync.call(this, command, args, options);
};

module.exports = state;
