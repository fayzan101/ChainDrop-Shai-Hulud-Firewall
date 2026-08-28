/**
 * Synthetic sandbox fixture — reads a canary and opens a socket.
 * Detonate only inside sandbox/Docker, never on the host or GHA runner directly.
 */

const fs = require("node:fs");
const net = require("node:net");

fs.readFileSync("/home/sandbox/.npmrc", "utf8");

// Literal IP avoids DNS stalls under --network none in CI.
const socket = net.connect({ port: 443, host: "127.0.0.1" });
socket.destroy();
