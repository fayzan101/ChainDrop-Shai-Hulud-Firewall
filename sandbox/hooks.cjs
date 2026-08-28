/**
 * Node preload hooks — installed only inside the sandbox container.
 */

const fs = require("node:fs");
const net = require("node:net");
const cp = require("node:child_process");
const { createBehaviorState } = require("./state.cjs");

const scriptId = process.env.SENTRYHULUD_SCRIPT_ID || "unknown";
const state = createBehaviorState(scriptId);
global.__SENTRYHULUD_BEHAVIOR_STATE__ = state;

function recordNetAttempt(host, port, protocol = "tcp") {
  state.recordNet(host, port, protocol);
}

function parseConnectArgs(args) {
  let host = "unknown";
  let port = 0;
  const first = args[0];
  if (typeof first === "object" && first !== null) {
    host = first.host || first.hostname || host;
    port = first.port ?? port;
  } else if (typeof first === "number") {
    port = first;
    if (typeof args[1] === "string") {
      host = args[1];
    }
  } else if (typeof first === "string") {
    host = first;
    port = typeof args[1] === "number" ? args[1] : port;
  }
  return { host, port };
}

function patchNetModule(netModule) {
  if (!netModule || netModule.__sentryhuludNetPatched) {
    return netModule;
  }
  const originalCreateConnection = netModule.createConnection.bind(netModule);
  function wrappedCreateConnection(...args) {
    const { host, port } = parseConnectArgs(args);
    recordNetAttempt(host, port, "tcp");
    return originalCreateConnection(...args);
  }
  netModule.createConnection = wrappedCreateConnection;
  netModule.connect = wrappedCreateConnection;
  netModule.__sentryhuludNetPatched = true;
  return netModule;
}

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

patchNetModule(net);

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

function flushOnSignal() {
  state.persist();
}

process.once("SIGTERM", () => {
  flushOnSignal();
  process.exit(143);
});
process.once("SIGINT", () => {
  flushOnSignal();
  process.exit(130);
});

module.exports = state;
