throw new Error("SentryHulud synthetic fixture — do not execute");

// Static-analysis hints only (Phase 2+). This file is not a worm and must never be spawned.
const HINTS = ["child_process", ".npmrc", "https.request", "os.homedir"];
void HINTS;
