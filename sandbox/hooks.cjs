/**
 * Node preload hooks — installed only inside the sandbox container.
 * Broader coverage than spawn/fs.readFile alone; still detectable by malware
 * that inspects process.execArgv — prefer external observers long-term.
 */

const fs = require("node:fs");
const fsp = fs.promises;
const net = require("node:net");
const http = require("node:http");
const https = require("node:https");
const dns = require("node:dns");
const cp = require("node:child_process");
const { createBehaviorState } = require("./state.cjs");

const scriptId = process.env.SENTRYHULUD_SCRIPT_ID || "unknown";
const state = createBehaviorState(scriptId);
// Deliberately not assigned to a stable global name that is easy to fingerprint.
const behaviorState = state;

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

function wrapFsMethod(target, name) {
  const original = target[name];
  if (typeof original !== "function") {
    return;
  }
  target[name] = function wrapped(...args) {
    const pathArg = args[0];
    if (typeof pathArg === "string" || Buffer.isBuffer(pathArg)) {
      const op =
        name.includes("write") || name.includes("append") ? "write" : "read";
      state.recordFile(pathArg, op);
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
  "appendFileSync",
  "appendFile",
  "statSync",
  "stat",
  "lstatSync",
  "lstat",
  "readdirSync",
  "readdir",
  "createReadStream",
  "createWriteStream",
  "accessSync",
  "access",
]) {
  wrapFsMethod(fs, method);
}

for (const method of [
  "readFile",
  "open",
  "writeFile",
  "appendFile",
  "stat",
  "lstat",
  "readdir",
  "access",
]) {
  wrapFsMethod(fsp, method);
}

patchNetModule(net);

function wrapRequest(mod, protocol) {
  if (!mod || mod.__sentryhuludHttpPatched) {
    return;
  }
  const original = mod.request.bind(mod);
  mod.request = function wrappedRequest(urlOrOpts, options, callback) {
    let host = "unknown";
    let port = protocol === "https" ? 443 : 80;
    if (typeof urlOrOpts === "string") {
      try {
        const u = new URL(urlOrOpts);
        host = u.hostname;
        port = Number(u.port || port);
      } catch {
        host = urlOrOpts;
      }
    } else if (urlOrOpts && typeof urlOrOpts === "object") {
      host = urlOrOpts.hostname || urlOrOpts.host || host;
      port = urlOrOpts.port ?? port;
    }
    recordNetAttempt(host, port, protocol);
    return original(urlOrOpts, options, callback);
  };
  if (typeof mod.get === "function") {
    const originalGet = mod.get.bind(mod);
    mod.get = function wrappedGet(...args) {
      return originalGet(...args);
    };
  }
  mod.__sentryhuludHttpPatched = true;
}

wrapRequest(http, "http");
wrapRequest(https, "https");

if (dns && !dns.__sentryhuludDnsPatched) {
  const originalLookup = dns.lookup && dns.lookup.bind(dns);
  if (originalLookup) {
    dns.lookup = function wrappedLookup(hostname, ...rest) {
      recordNetAttempt(String(hostname), 0, "dns");
      return originalLookup(hostname, ...rest);
    };
  }
  dns.__sentryhuludDnsPatched = true;
}

function wrapSpawn(name) {
  const original = cp[name];
  if (typeof original !== "function") {
    return;
  }
  cp[name] = function wrapped(command, args, options) {
    state.recordProcess(command, args);
    return original.call(this, command, args, options);
  };
}

for (const name of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]) {
  wrapSpawn(name);
}

if (typeof globalThis.fetch === "function" && !globalThis.__sentryhuludFetchPatched) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = function wrappedFetch(input, init) {
    try {
      const url = typeof input === "string" ? input : input && input.url;
      if (url) {
        const u = new URL(url, "http://invalid.local");
        recordNetAttempt(u.hostname, Number(u.port || 0), "fetch");
      }
    } catch {
      // ignore
    }
    return originalFetch(input, init);
  };
  globalThis.__sentryhuludFetchPatched = true;
}

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

module.exports = behaviorState;
