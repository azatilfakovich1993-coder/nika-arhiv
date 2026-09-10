---
name: feedback-git-autopush
description: Auto-commit and push to GitHub at the end of work sessions on projects with a remote set up
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fa2e767a-a1c7-4fcb-90d0-31792297aab5
---

When working on a project that has a GitHub remote configured (e.g. good-vahta — see [[project_good_vahta]]), commit and push changes at the end of the work session without waiting to be asked each time.

**Why:** User works on this project from multiple computers (work + home) and needs changes synced via GitHub so they can pick up where they left off on either machine. Explicitly asked "сделай" (do it) when offered this as a standing behavior.

**How to apply:** After a meaningful chunk of changes (not necessarily every single edit) on a repo with a remote already configured, run `git add -A && git commit -m "..." && git push`. Use a descriptive commit message summarizing the session's changes. If the repo has no remote configured yet, this doesn't apply — ask first before setting one up.
