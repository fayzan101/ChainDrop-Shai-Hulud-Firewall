# Interceptor (Phase 1)

Captures `preinstall` / `install` / `postinstall` from a lockfile and local `package.json` files. **It does not execute those scripts** and does not spawn `npm` / `yarn` / `pnpm` install.

```bash
node interceptor/cli.mjs --dir fixtures/benign-lockfile
node interceptor/cli.mjs --dir fixtures/synthetic-suspicious --out /tmp/bundles.json
```

Missing lockfile exits `1` (fail closed).

Lockfile preference if several exist: `package-lock.json`, `npm-shrinkwrap.json`, `pnpm-lock.yaml`, `yarn.lock`.

Yarn/pnpm: root `package.json` scripts only until tarball fetch (issue #22). npm lockfile v2/v3 also walks on-disk `node_modules/*/package.json` when present.

Tarball download by integrity is **not** enabled in this slice (offline CI).
