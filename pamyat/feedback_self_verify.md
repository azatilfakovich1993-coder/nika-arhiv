---
name: feedback-self-verify
description: "User wants me to proactively self-verify each step of a fix, not just report it as done"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: b498c587-9f7f-4def-a181-2146fe4a532d
---

When fixing bugs (especially "make the search/matching logic correct" type requests), verify each fix actually works before moving on or reporting success — don't just read the code, reason about it, and declare it fixed.

**Why:** During the good-vahta resume-visibility bug chain (2026-06-22), surface-level fixes kept revealing deeper bugs only when actually exercised: a fix to `submitResume`'s published-state handling looked correct by inspection, but running it in a real browser exposed that the default `workerStatus.open` was `false` (so new resumes started hidden), that `toggleWorkerStatus` didn't re-render the UI, and that it synced to Supabase using a different id scheme than `submitResume` (silently writing to the wrong row). None of these would have been caught by code review alone — only by driving the actual app (Playwright + a temp dir with `playwright` installed, since the project itself doesn't have it) end-to-end against the real Supabase backend with two separate sessions (worker + employer).

**How to apply:** For logic/data-flow fixes, after editing: (1) run/build the project, (2) drive the actual user flow (browser automation, CLI invocation, etc.) rather than just re-reading the diff, (3) check the real downstream state (e.g., query the actual database row), not just the immediate function's local correctness. Use the `/run` skill's chromium-cli/Playwright pattern for browser-driven apps. When something doesn't behave as expected, treat that as a new bug to chase down rather than a quirk of the test.
