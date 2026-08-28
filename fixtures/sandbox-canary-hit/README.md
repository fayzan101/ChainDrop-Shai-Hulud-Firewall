# Sandbox canary-hit fixture

Synthetic script for **Phase 5** only. It is **not** malware.

- Reads the fake npm canary at `/home/sandbox/.npmrc`
- Attempts a TCP connect to `exfil.sinkhole.test:443` (network is `none`; the attempt is still logged)

Do **not** run `node script.js` on your workstation. Use:

```bash
docker build -t sentryhulud-sandbox:dev sandbox/
node sandbox/cli.mjs --build --script fixtures/sandbox-canary-hit/script.js --policy
```

The orchestrator (`sandbox/run.mjs`) never executes this file on the host.
