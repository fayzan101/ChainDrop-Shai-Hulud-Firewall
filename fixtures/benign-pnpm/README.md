# Benign pnpm lockfile fixture

Represents a legitimate native-addon `install` hook (`node-gyp rebuild`) in a pnpm layout.

Do not run `pnpm install` here as part of SentryHulud tests. The Phase 1 interceptor should list the `install` script and refuse to execute it.

This is a synthetic fixture for lockfile parsing only — not a real `node-gyp` tarball.
