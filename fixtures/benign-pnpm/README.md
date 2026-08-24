# Benign pnpm lockfile fixture

Represents a legitimate native-addon `install` hook (`node-gyp rebuild`) in a pnpm workspace layout.

- Do **not** run `pnpm install` here as part of SentryHulud / ChainDrop tests.
- Phase 1 interceptor should list the `install` script and refuse to execute it.
