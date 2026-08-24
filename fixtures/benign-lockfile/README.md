# Benign lockfile fixture

Represents a legitimate native-addon `install` hook (`node-gyp rebuild`).

- Do not run `npm install` here as part of SentryHulud tests.
- Phase 1 interceptor should list the `install` script and refuse to execute it.
